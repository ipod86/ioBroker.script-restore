// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			backupPath: string;
			ftpEnabled: boolean;
			ftpHost: string;
			ftpPort: number;
			ftpUser: string;
			ftpPassword: string;
			ftpPath: string;
			ftpSecure: boolean;
			smbEnabled: boolean;
			smbHost: string;
			smbShare: string;
			smbPath: string;
			smbUser: string;
			smbPassword: string;
			smbDomain: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
