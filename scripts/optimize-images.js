import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 画像最適化の設定
const OPTIMIZE_CONFIG = {
  // PNG最適化設定
  png: {
    quality: 85,
    compressionLevel: 9,
    adaptiveFiltering: true,
    palette: true, // パレットモードを使用してファイルサイズを削減
  },
  // 最大幅・高さ（必要に応じてリサイズ）
  maxWidth: 2000,
  maxHeight: 2000,
};

// 画像を最適化する関数
async function optimizeImage(inputPath, outputPath) {
  try {
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size;

    // 画像を読み込んで最適化
    let image = sharp(inputPath);
    const metadata = await image.metadata();

    // リサイズが必要な場合
    if (metadata.width > OPTIMIZE_CONFIG.maxWidth || metadata.height > OPTIMIZE_CONFIG.maxHeight) {
      image = image.resize(OPTIMIZE_CONFIG.maxWidth, OPTIMIZE_CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // PNG最適化
    await image
      .png({
        quality: OPTIMIZE_CONFIG.png.quality,
        compressionLevel: OPTIMIZE_CONFIG.png.compressionLevel,
        adaptiveFiltering: OPTIMIZE_CONFIG.png.adaptiveFiltering,
        palette: OPTIMIZE_CONFIG.png.palette,
      })
      .toFile(outputPath);

    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size;
    const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(2);

    return {
      success: true,
      originalSize,
      newSize,
      reduction: `${reduction}%`,
      path: outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: inputPath,
    };
  }
}

// ディレクトリ内の画像を再帰的に処理
async function processDirectory(dirPath, outputDir) {
  try {
    // 出力ディレクトリが存在しない場合は作成
    await fs.mkdir(outputDir, { recursive: true });

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      const inputPath = path.join(dirPath, entry.name);
      const outputPath = path.join(outputDir, entry.name);

      if (entry.isDirectory()) {
        // サブディレクトリの場合は再帰的に処理
        const subResults = await processDirectory(inputPath, outputPath);
        results.push(...subResults);
      } else if (entry.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
        // 画像ファイルの場合
        console.log(`処理中: ${inputPath}`);
        const result = await optimizeImage(inputPath, outputPath);
        results.push(result);

        if (result.success) {
          console.log(
            `✓ ${path.basename(inputPath)}: ${(result.originalSize / 1024).toFixed(2)}KB → ${(result.newSize / 1024).toFixed(2)}KB (${result.reduction}削減)`
          );
        } else {
          console.error(`✗ ${path.basename(inputPath)}: ${result.error}`);
        }
      }
    }

    return results;
  } catch (error) {
    console.error(`ディレクトリ処理エラー: ${dirPath}`, error);
    return [];
  }
}

// メイン処理
async function main() {
  const inputDir = path.join(__dirname, '../public/new-png-assets2');
  const outputDir = path.join(__dirname, '../public/new-png-assets2-optimized');

  console.log('画像最適化を開始します...');
  console.log(`入力ディレクトリ: ${inputDir}`);
  console.log(`出力ディレクトリ: ${outputDir}`);
  console.log('');

  // 既存の出力ディレクトリを削除（オプション）
  try {
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    // ディレクトリが存在しない場合は無視
  }

  const results = await processDirectory(inputDir, outputDir);

  // 結果サマリー
  console.log('');
  console.log('=== 最適化結果 ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    const totalOriginal = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalNew = successful.reduce((sum, r) => sum + r.newSize, 0);
    const totalReduction = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(2);

    console.log(`成功: ${successful.length}ファイル`);
    console.log(`失敗: ${failed.length}ファイル`);
    console.log(`合計サイズ: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalNew / 1024 / 1024).toFixed(2)}MB`);
    console.log(`削減率: ${totalReduction}%`);
  }

  if (failed.length > 0) {
    console.log('');
    console.log('失敗したファイル:');
    failed.forEach(f => console.log(`  - ${f.path}: ${f.error}`));
  }

  console.log('');
  console.log('最適化が完了しました。');
  console.log(`最適化された画像は ${outputDir} に保存されています。`);
}

main().catch(console.error);

