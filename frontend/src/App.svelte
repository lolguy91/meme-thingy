<script lang="ts">
	import { onMount } from 'svelte';

	const on_idle = requestIdleCallback || setTimeout;

	let clicked = false;
	let src = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';

	let is_master = false;

	let url = location.pathname;

	let video: HTMLVideoElement;

	onMount(() => {
		document.body.addEventListener('click', () => {
			if (!clicked) {
				clicked = true;

				const [, , id] = url.split('/');

				if (id) {
					socket.emit('follow', id);
				}

				on_idle(() => {
					video.addEventListener('pause', () =>
						socket.emit('forward', 'pause', video.currentTime)
					);

					video.addEventListener('play', () =>
						socket.emit('forward', 'play', video.currentTime)
					);

					video.addEventListener('seeked', () => {
						on_idle(() => {
							socket.emit(
								'forward',
								video.paused ? 'pause' : 'play',
								video.currentTime
							);
						});
					});
				});
			}
		});
	});

	const socket = (window as any).io();

	socket.on(
		'src',
		(type: 'video' | 'image', new_src: string, description: string) => {
			mode = type;
			src = new_src;
			alt = description;
		}
	);

	socket.on('play', (time: number) => {
		on_idle(() => {
			video.currentTime = time;
			video.play();
		});
	});

	socket.on('pause', (time: number) => {
		on_idle(() => {
			video.currentTime = time;
			video.pause();
		});
	});

	let mode: 'image' | 'video' = 'video';
	let alt = '';

	$: is_master &&
		socket.emit('getID', (id: string) => {
			history.pushState('', '', (url = `/stream/${id}`));
		});
</script>

<main>
	{#if clicked}
		{#if mode === 'image'}
			<img {src} {alt} />
		{:else if mode === 'video'}
			<video bind:this={video} class="player" controls {src}>
				<track kind="captions" />
			</video>
		{/if}

		<p>
			<input
				type="checkbox"
				name="ismaster"
				id="ismaster"
				bind:checked={is_master}
			/>

			<label for="ismaster"> I want to stream </label>
		</p>

		{#if is_master}
			Source: <input type="text" bind:value={src} />

			<select bind:value={mode}>
				{#each ['video', 'image'] as type}
					<option value={type}>{type}</option>
				{/each}
			</select>

			<button on:click={() => socket.emit('fwdinit', 'src', mode, src)}>
				push
			</button>
		{/if}
	{:else}
		<button>Click here to allow HTML5 video! 😊</button>
	{/if}
</main>

<style>
	.player {
		background-color: rgb(7, 2, 19);
		width: 99%;
		height: 97%;
		border-radius: 10px;
	}
</style>
