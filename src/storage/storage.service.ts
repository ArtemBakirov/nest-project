import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import lighthouse from '@lighthouse-web3/sdk';
import * as fs from 'node:fs/promises';
import { ethers } from 'ethers';
import kavach from '@lighthouse-web3/kavach';

@Injectable()
export class StorageService {
  constructor(
    private readonly apiKey: string,
    private readonly walletAddress: string,
    private readonly walletPrivKey: string,
  ) {}

  async uploadFile(tempFilePath: string, originalName: string) {
    try {
      // lighthouse.upload принимает путь к файлу
      const resp = await lighthouse.upload(tempFilePath, this.apiKey);
      // подчистим временный файл
      await fs.unlink(tempFilePath);

      const cid = resp.data.Hash;
      return {
        cid,
        ipfs: `ipfs://${cid}`,
        http: `https://gateway.lighthouse.storage/ipfs/${cid}`,
        name: originalName,
      };
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException('Lighthouse upload failed');
    }
  }

  async uploadFileEncrypted(tempFilePath: string, originalName: string) {
    try {
      // Получаем JWT (можно кэшировать на N минут/часов)
      const jwt = await this.getLighthouseEncryptionJWT(
        this.walletAddress,
        this.walletPrivKey,
      );
      console.log('got JWT', jwt);

      // uploadEncrypted(pathOrFile, apiKey, publicKey(address), signedMessageOrJWT)
      const resp = await lighthouse.uploadEncrypted(
        tempFilePath,
        this.apiKey,
        this.walletAddress,
        jwt, // вместо подписи используем JWT
      );

      await fs.unlink(tempFilePath);

      // В ответе тоже будет CID (файл лежит в IPFS/Filecoin, но в виде шифротекста)
      const cid = resp.data[0]?.Hash ?? '';
      return {
        cid,
        // публичный URL отдаст шифротекст; расшифровка — только через ваш доступ/ключи
        ipfs: `ipfs://${cid}`,
        http: `https://gateway.lighthouse.storage/ipfs/${cid}`,
        name: originalName,
        encrypted: true,
      };
    } catch (e) {
      console.error(e);
      throw new InternalServerErrorException(
        'Lighthouse encrypted upload failed',
      );
    }
  }

  async getLighthouseEncryptionJWT(
    address: string,
    privateKey: string,
  ): Promise<string> {
    const signer = new ethers.Wallet(privateKey);
    if (signer.address.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Address does not match private key');
    }
    // 1) Получаем challenge
    const authMsg = await kavach.getAuthMessage(address);
    // 2) Подписываем
    const signature = await signer.signMessage(authMsg.message || '');
    // 3) Меняем подпись на JWT
    const { JWT, error } = await kavach.getJWT(address, signature);
    if (error || !JWT) throw new Error('Failed to obtain Lighthouse JWT');
    return JWT as string;
  }

  async decryptAndStream(cid: string) {
    // 1) Check entitlements (PKOIN purchase, your DB, etc.)
    const userIsAllowed = true; // <- implement your logic
    if (!userIsAllowed) throw new ForbiddenException();

    // 2) Get JWT using your service wallet (cache this!)
    const jwt = await this.getLighthouseEncryptionJWT(
      this.walletAddress,
      this.walletPrivKey,
    );

    // 3) Fetch encryption key for the cid (as owner/service)
    const keyRes = await lighthouse.fetchEncryptionKey(
      cid,
      process.env.LH_ADDRESS!,
      jwt,
    );
    const fileKey = keyRes.data.key;

    // 4) Download encrypted bytes from gateway (or via IPFS client)
    const encResp = await fetch(
      `https://gateway.lighthouse.storage/ipfs/${cid}`,
    );
    const encArrayBuf = await encResp.arrayBuffer();

    // 5) Decrypt using SDK helper (it understands Lighthouse’s format)
    // Convert ArrayBuffer -> Blob-like for SDK
    const encryptedBlob = new Blob([encArrayBuf]);
    const decryptedBlob: Blob = await lighthouse.decryptFile(
      encryptedBlob,
      fileKey!,
    );
    const buf = Buffer.from(await decryptedBlob.arrayBuffer());
    return buf;
  }
}
