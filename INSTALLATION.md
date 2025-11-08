# 📦 Installation & Setup Guide

## 🎯 Hızlı Kurulum (5 Dakika)

### Adım 1: Supabase SQL Şemasını Çalıştırın

1. **Supabase Dashboard'a gidin**: https://supabase.com/dashboard
2. **Projenizi seçin**: `ukalifoxsciqbeyrupmu`
3. **SQL Editor**'a gidin (sol menüden)
4. **New query** butonuna tıklayın
5. `supabase-schema.sql` dosyasının **TAMAMINI** kopyalayın
6. SQL Editor'a yapıştırın
7. **RUN** butonuna tıklayın
8. "Success. No rows returned" mesajını görmelisiniz ✅

**ÖNEMLİ**: SQL kodunu **TAM OLARAK** çalıştırdığınızdan emin olun!

### Adım 2: Tabloları Kontrol Edin

1. **Table Editor**'a gidin (sol menüden)
2. Şu 4 tablonun oluşturulduğunu kontrol edin:
   - ✅ `profiles`
   - ✅ `secrets`
   - ✅ `secret_views`
   - ✅ `replies`

### Adım 3: CORS Ayarlarını Yapın

1. **Settings > API** (sol menüden)
2. Sayfayı **aşağı kaydırın**
3. **CORS** veya **Allowed Origins** bölümünü bulun
4. Şu domain'leri ekleyin (her biri ayrı satır):
   ```
   https://www.onescrt.com
   https://onescrt.com
   ```
5. **Save** butonuna tıklayın
6. **30 saniye bekleyin** (CORS ayarları biraz zaman alabilir)

### Adım 4: Test Edin

1. Web sitenizi açın: https://www.onescrt.com
2. **F12** tuşuna basın (Browser Developer Tools)
3. **Console** sekmesine gidin
4. Şu mesajları görmelisiniz:
   - ✅ "Supabase client initialized"
   - ✅ "Credentials appear valid (CORS is working)"
   - ✅ "Supabase connection test successful"
   - ✅ "Anonymous identity ready"

## ✅ Kurulum Tamamlandı!

Artık projeniz çalışıyor olmalı. Şunları yapabilirsiniz:
- ✅ Secret gönderebilirsiniz
- ✅ Secret alabilirsiniz
- ✅ Secret'lara yanıt gönderebilirsiniz
- ✅ Inbox'unuzu kontrol edebilirsiniz

## 🔧 Mevcut Yapılandırma

- **Supabase URL**: `https://ukalifoxsciqbeyrupmu.supabase.co`
- **API Key**: script.js'de yapılandırıldı
- **Database**: PostgreSQL (Supabase)
- **Encryption**: RSA-OAEP 4096-bit

## ❓ Sorun Giderme

### CORS Hatası
- CORS ayarlarını kontrol edin (Settings > API > CORS)
- Domain'in doğru eklendiğinden emin olun
- 30 saniye bekleyin ve sayfayı yenileyin

### Table Not Found
- SQL şemasını çalıştırdığınızdan emin olun
- Table Editor'da tabloları kontrol edin

### API Key Hatası
- script.js'deki API key'in doğru olduğundan emin olun
- Supabase Dashboard'dan anon/public key'i kontrol edin

## 📚 Dokümantasyon

- `README.md` - Proje dokümantasyonu
- `SUPABASE-TROUBLESHOOTING.md` - Sorun giderme rehberi
- `FREE-PLAN-CORS-FIX.md` - CORS ayarları rehberi
- `API-KEY-SETUP.md` - API key kurulum rehberi

