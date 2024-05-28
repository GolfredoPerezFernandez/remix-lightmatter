-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "bio" TEXT,
    "birthday" DATETIME,
    "gender" TEXT,
    "avatar" TEXT,
    "profession" TEXT,
    "community" TEXT,
    "city" TEXT,
    "province" TEXT,
    "address" TEXT
);

-- CreateTable
CREATE TABLE "Password" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salt" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER NOT NULL,
    "chisq" REAL NOT NULL,
    "lamdaLow" REAL NOT NULL,
    "lamdaHigh" REAL NOT NULL,
    "lamdaInit" REAL NOT NULL,
    "deltachi" REAL NOT NULL,
    "tolerance" REAL NOT NULL,
    "params" TEXT NOT NULL,
    "alpha" TEXT NOT NULL,
    "difference" TEXT NOT NULL,
    "dfRealPartX" TEXT NOT NULL,
    "dfRealPartY" TEXT NOT NULL,
    "dfImaginaryPartX" TEXT NOT NULL,
    "dfImaginaryPartY" TEXT NOT NULL,
    "imaginaryPartX" TEXT NOT NULL,
    "imaginaryPartY" TEXT NOT NULL,
    CONSTRAINT "AnalysisResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");
