import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { finished } from 'stream';

import { ChunkDescriptor } from './ChunkDescriptor';

export class DataDescriptor {
	length = 0;
	parts = new Array<ChunkDescriptor>();

	url?: string;

	constructor(url?: string | undefined) {
		this.url = url;
	}

	addChunk(offset: number, chunk: Buffer) {
		let index = 0;

		while (this.parts[index]?.start < offset) {
			++index;
		}

		this.parts.splice(
			index,
			this.parts[index]?.start === offset &&
				this.parts[index]?.length <= chunk.length
				? 1
				: 0,
			new ChunkDescriptor(offset, chunk)
		);
	}

	async read(
		start: number,
		length: number,
		known_offset: number = 0
	): Promise<Buffer> {
		try {
			while (this.parts[known_offset + 1]?.start < start) {
				++known_offset;
			}

			// this.parts[known] has the correct chunk to start reading at

			if (
				this.parts[known_offset]?.start <= start &&
				this.parts[known_offset]?.end >= start
			) {
				const first_read = await this.parts[known_offset].read();
				const first = first_read.subarray(
					start - this.parts[known_offset].start
				);

				if (first.length >= length) {
					return first.subarray(0, length);
				} else {
					return Buffer.concat([
						first,
						await this.read(
							start + first.length,
							length - first.length,
							known_offset + 1
						),
					]);
				}
			} else if (this.url) {
				const response = await fetch(this.url, {
					headers: {
						range: `bytes=${start}-${start + length - 1}`,
					},
				});

				if (response.status === 200) {
					let position = 0;
					let data_offset = 0;

					response.body.on('data', (chunk: Buffer) => {
						const descriptor = new ChunkDescriptor(
							data_offset,
							chunk
						);

						data_offset += chunk.length;

						while (this.parts[position]?.start < data_offset) {
							++position;
						}

						if (this.parts[position]?.start > data_offset) {
							this.parts.splice(position, 0, descriptor);
						} else if (
							this.parts[position]?.length <= chunk.length
						) {
							this.parts.splice(position, 1, descriptor);
						} else if (
							this.parts[position]?.length > chunk.length
						) {
							return;
						} else {
							this.parts.push(descriptor);
						}
					});

					return new Promise<Buffer>((resolve) => {
						response.body.on('end', () => {
							if (data_offset > start) {
								resolve(this.read(start, length, known_offset));
							} else {
								resolve(Buffer.alloc(0));
							}
						});
					});
				} else if (response.status === 206) {
					const match = response.headers
						.get('content-range')
						?.match(/bytes (.+)\/(.+)/i);

					const buffer_offset =
						Number(match?.[1]?.split('-')?.shift?.()) || 0;

					let buffers = new Array<Buffer>();

					response.body.on('data', (chunk) => {
						buffers.push(chunk);
					});

					await new Promise((resolve) => {
						finished(response.body, resolve);

						response.body.resume();
					});

					const buffer = Buffer.concat(buffers);

					for (
						let index = 0;
						index < buffer.length;
						index += 0x100000
					) {
						this.addChunk(
							buffer_offset + 0x100000 * index,
							buffer.subarray(
								index * 0x100000,
								(index + 1) * 0x100000
							)
						);
					}

					return buffer;
				}
			}
		} catch (error) {
			console.error(error);
		}

		return Buffer.alloc(0);
	}
}
