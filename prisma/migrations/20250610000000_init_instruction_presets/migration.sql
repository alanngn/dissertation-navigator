-- CreateTable
CREATE TABLE "InstructionPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructionPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresetSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "activePresetId" TEXT,

    CONSTRAINT "PresetSettings_pkey" PRIMARY KEY ("id")
);
