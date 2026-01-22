/**
 * AES-256-GCM Encryption utilities for Edge Runtime
 * Used for encrypting sensitive data like Meta access tokens
 *
 * Uses Web Crypto API which is available in Edge Runtime
 */

/**
 * Encryption result containing ciphertext and IV
 */
export interface EncryptedData {
  ciphertext: string // Base64 encoded
  iv: string // Base64 encoded (12 bytes for GCM)
  version: number // Encryption version for future migrations
}

/**
 * Get encryption key from environment
 * Key should be a 256-bit (32 byte) key, base64 encoded
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = process.env.ENCRYPTION_KEY

  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  // Decode base64 key
  const keyData = base64ToArrayBuffer(keyString)

  if (keyData.byteLength !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (256 bits)')
  }

  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string using AES-256-GCM
 */
export async function encrypt(plaintext: string): Promise<EncryptedData> {
  const key = await getEncryptionKey()

  // Generate random 12-byte IV for GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encode plaintext to bytes
  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  // Encrypt
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    version: 1,
  }
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decrypt(encrypted: EncryptedData): Promise<string> {
  if (encrypted.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`)
  }

  const key = await getEncryptionKey()

  // Decode base64 values
  const ciphertextBuffer = base64ToArrayBuffer(encrypted.ciphertext)
  const iv = base64ToArrayBuffer(encrypted.iv)

  // Decrypt
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertextBuffer
  )

  // Decode bytes to string
  const decoder = new TextDecoder()
  return decoder.decode(plaintextBuffer)
}

/**
 * Hash a string using SHA-256
 * Used for IP address hashing
 */
export async function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return arrayBufferToHex(hashBuffer)
}

/**
 * Hash IP address with salt for privacy
 */
export async function hashIPAddress(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT || 'free-real-estate-default-salt'
  return hashSHA256(`${ip}:${salt}`)
}

/**
 * Generate a random event ID for Meta CAPI deduplication
 */
export function generateEventId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return arrayBufferToHex(bytes.buffer)
}

// ============================================================================
// Helper functions for Base64 and Hex encoding
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert ArrayBuffer to Hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a new encryption key (for setup purposes)
 * Returns base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return arrayBufferToBase64(key.buffer)
}
