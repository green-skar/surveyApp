import { getToken } from '@auth/core/jwt';
import { getContext } from 'hono/context-storage';

export default function CreateAuth() {
	const auth = async () => {
		const c = getContext();
		const token = await getToken({
			req: c.req.raw,
			secret: process.env.AUTH_SECRET,
			secureCookie: process.env.AUTH_URL?.startsWith('https') ?? false,
		});
		if (token) {
			return {
				user: {
					id: token.sub,
					email: token.email,
					name: token.name,
					image: token.picture,
					role: token.role ?? 'user',
					mustChangePassword: Boolean(token.mustChangePassword),
					...(token.adminDbId != null
						? { adminDbId: Number(token.adminDbId) }
						: {}),
				},
				expires: token.exp.toString(),
			};
		}
	};
	return {
		auth,
	};
}
