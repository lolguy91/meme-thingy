<script lang="ts">
	import { onMount } from 'svelte';

	let clicked = false;
	let src = 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';

	onMount(() => {
		document.body.addEventListener('click', () => (clicked = true));
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

	let mode: 'image' | 'video' = 'video';
	let alt = '';
</script>

<main>
	{#if clicked}
		{#if mode === 'image'}
			<img {src} {alt} />
		{:else if mode === 'video'}
			<video class="player" controls>
				<track kind="captions" />
				<source {src} />
			</video>
		{/if}
	{:else}
		<h1>Please click anywhere to allow HTML5 video! 😊</h1>
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
