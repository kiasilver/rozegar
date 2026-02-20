-- Create MediaFile table to track uploaded files
CREATE TABLE IF NOT EXISTS "MediaFile" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL, -- 'image', 'video', 'other'
    "size" BIGINT NOT NULL,
    "folder" VARCHAR(255) NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "MediaFile_user_id_idx" ON "MediaFile"("user_id");
CREATE INDEX IF NOT EXISTS "MediaFile_url_idx" ON "MediaFile"("url");
CREATE INDEX IF NOT EXISTS "MediaFile_type_idx" ON "MediaFile"("type");
CREATE INDEX IF NOT EXISTS "MediaFile_folder_idx" ON "MediaFile"("folder");

-- Add foreign key
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

