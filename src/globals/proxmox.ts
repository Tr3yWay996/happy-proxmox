import env from "@/globals/env"
import proxmoxApi from "proxmox-api"

export const client = proxmoxApi({
	host: env.PROXMOX_HOST,
	password: env.PROXMOX_PASSWORD
})

/**
 * Get the IP Address of a Demo Access
 * @since 1.15.0
*/ export function getIP(id: number) {
	const ip = env.PROXMOX_NET_IP.first()
	ip.rawData[3] = 10 + (id % 246)

	return ip
}