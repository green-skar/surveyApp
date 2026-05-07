import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	// Avoid prerendering all routes: many pages need auth/DB at render time and stall `react-router build`.
	prerender: [],
} satisfies Config;
