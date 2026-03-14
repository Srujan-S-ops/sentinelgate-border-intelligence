export interface Block {
    index: number;
    timestamp: string;
    data: any;
    previousHash: string;
    hash: string;
}

export class SimpleBlockchain {
    chain: Block[];

    constructor() {
        this.chain = [this.createGenesisBlock()];
    }

    createGenesisBlock(): Block {
        const timestamp = new Date().toISOString();
        const data = { message: "SentinelGate Genesis Block - System Initialized" };
        const index = 0;
        const previousHash = "0".repeat(64);
        return {
            index,
            timestamp,
            data,
            previousHash,
            hash: this.calculateHash(index, timestamp, previousHash, data)
        };
    }

    getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    addBlock(data: any): Block {
        const previousBlock = this.getLatestBlock();
        const newIndex = previousBlock.index + 1;
        const newTimestamp = new Date().toISOString();
        const newHash = this.calculateHash(newIndex, newTimestamp, previousBlock.hash, data);
        
        const newBlock: Block = {
            index: newIndex,
            timestamp: newTimestamp,
            data,
            previousHash: previousBlock.hash,
            hash: newHash
        };
        
        this.chain.push(newBlock);
        return newBlock;
    }

    // A fast, synchronous mock hash to simulate SHA-256 for the hackathon demo
    calculateHash(index: number, timestamp: string, previousHash: string, data: any): string {
        const str = index + timestamp + previousHash + JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Pad to look like a 64-character SHA-256 hex string
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        // Repeat it to make it 64 chars long to look like realistic SHA-256 visually
        let fakeSha256 = (hex.repeat(8)).substring(0, 56) + Math.abs(str.length * 31).toString(16).padStart(8, '0');
        return fakeSha256;
    }
}
