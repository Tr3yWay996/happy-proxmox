import env from "@/globals/env"
import { User } from "discord.js"
import axios from "axios"
import { network } from "@rjweb/utils"

/**
 * Format a URL
 * @since 1.15.0
*/ export function url(url: string, ip: network.IPAddress<4>): string{
	return url.replace('{}', ip.rawData[3].toString())
}

/**
 * Create a new User
 * @since 1.1.0
*/ export async function createUser(ip: network.IPAddress<4>, user: User, password: string): Promise<number> {
	const pterodactylUrl = url(env.PTERO_URL, ip)
	console.log(`Creating user for ${user.username} (${user.id}) at ${pterodactylUrl}`)
	
	try {
		const data = await axios.post(`${pterodactylUrl}/api/application/users`, {
			email: `demo.${user.id}@demo.panel`,
			username: 'demo',
			first_name: 'Demo',
			last_name: user.id,
			root_admin: true,
			password
		}, {
			headers: {
				Authorization: `Bearer ${env.PTERO_ADMIN_TOKEN}`,
				Accept: 'application/json'
			}
		})

		await Promise.all(env.PTERO_DEMO_SERVERS.map((server) => axios.post(`${pterodactylUrl}/api/client/servers/${server}/users`, {
			email: `demo.${user.id}@demo.panel`,
			permissions: [
				'control.console'
			]
		}, {
			headers: {
				Authorization: `Bearer ${env.PTERO_CLIENT_TOKEN}`,
				Accept: 'application/json'
			}
		})))

		return data.data.attributes.id
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.error(`Failed to create user at ${pterodactylUrl}:`, {
				status: error.response?.status,
				statusText: error.response?.statusText,
				data: error.response?.data
			})
		} else {
			console.error(`Failed to create user at ${pterodactylUrl}:`, error)
		}
		throw error
	}
}