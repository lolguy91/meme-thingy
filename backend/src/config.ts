import { getConfig } from 'doge-config';

export const config = getConfig('meme-thingy', {
	port: process.env.port || 3030,
});
