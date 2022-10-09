import nsblob from 'nsblob-native-if-available';

export class ChunkDescriptor {
	length: number;
	start: number;
	end: number;
	hash: string | Promise<string>;

	constructor(offset: number, data: Buffer) {
		this.start = offset;
		this.end = offset + (this.length = data.length);

		const promise = nsblob.store(data);

		this.hash = promise;

		promise.then((hash) => (this.hash = hash));
	}

	async read() {
		return nsblob.fetch(await this.hash);
	}
}
