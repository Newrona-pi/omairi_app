# 画像最適化スクリプト

このスクリプトは、`public/new-png-assets2/`フォルダ内の画像を自動的に最適化して、ファイルサイズを削減します。

## 使用方法

### 1. 依存関係のインストール

```bash
cd omatsuri-site
pnpm install
```

### 2. 画像最適化の実行

```bash
pnpm run optimize:images
```

このコマンドを実行すると：
- `public/new-png-assets2/`内のすべての画像を最適化
- 最適化された画像を`public/new-png-assets2-optimized/`に保存
- 元の画像はそのまま保持されます

### 3. 最適化された画像の確認

最適化が完了したら、`public/new-png-assets2-optimized/`フォルダを確認してください。
問題がなければ、元のフォルダと置き換えることができます。

## 最適化設定

- **品質**: 85%
- **圧縮レベル**: 9（最高）
- **最大サイズ**: 2000x2000px（それ以上は自動リサイズ）
- **パレットモード**: 有効（ファイルサイズ削減）

## Firebase Functionsによる自動最適化

Firebase Storageに画像をアップロードすると、自動的に最適化されます。

### Functionsのデプロイ

```bash
cd omatsuri-site/functions
npm install
cd ../..
firebase deploy --only functions
```

### 動作

- `new-png-assets2/`フォルダに画像がアップロードされると自動的に最適化
- 元のファイルが最適化されたバージョンに置き換えられます
- 既に最適化済みのファイル（`-optimized`を含む）はスキップされます

