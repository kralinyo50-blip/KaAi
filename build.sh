#!/bin/bash
echo "KaAi - Build"
echo "============"
echo ""
echo "1) Bağımlılıklar yükleniyor..."
npm install
if [ $? -ne 0 ]; then echo "npm install başarısız!"; exit 1; fi
echo ""
echo "2) EXE oluşturuluyor..."
npm run build -- --win --x64
if [ $? -ne 0 ]; then echo "Build hatası!"; exit 1; fi
echo ""
echo "Başarılı! dist/ klasörüne bakın."
