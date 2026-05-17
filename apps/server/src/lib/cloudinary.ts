import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})



export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// Uploads a buffer (PDF or image) to Cloudinary and returns the public URL.
// resource_type 'auto' lets Cloudinary handle both PDFs and images.
export function uploadInvoice(buffer: Buffer, originalName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'erp/invoices',
        public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      },
      (err, result) => {
        if (err) return reject(err)
        if (!result) return reject(new Error('Cloudinary returned no result'))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}
