import axios from 'axios';
import logger from '../utils/logger';

export class IPFSClient {
  private pinataApiKey: string;
  private pinataSecretKey: string;
  private pinataUrl: string = 'https://api.pinata.cloud';
  
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY || '';
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY || '';
    
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      logger.warn('Pinata credentials not found, IPFS uploads will fail');
    }
  }
  
  async uploadToIPFS(data: any): Promise<string> {
    return this.uploadJSON(data);
  }

  async uploadJSON(data: any): Promise<string> {
    try {
      const response = await axios.post(
        `${this.pinataUrl}/pinning/pinJSONToIPFS`,
        data,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey
          }
        }
      );
      
      const cid = response.data.IpfsHash;
      logger.info(`Uploaded to IPFS: ${cid}`);
      return cid;
    } catch (error: any) {
      logger.error('IPFS upload failed:', error.message);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }
  
  async fetchJSON(cid: string): Promise<any> {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to fetch IPFS content ${cid}:`, error.message);
      throw new Error(`IPFS fetch failed: ${error.message}`);
    }
  }
}

export const ipfsClient = new IPFSClient();
