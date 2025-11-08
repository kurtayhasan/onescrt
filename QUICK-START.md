# 🚀 Quick Start Guide

## ✅ Yapılacaklar (5 Dakika)

### 1. SQL Şemasını Çalıştırın

1. **Supabase Dashboard**: https://supabase.com/dashboard
2. **Projenizi seçin**: `ukalifoxsciqbeyrupmu`
3. **SQL Editor**'a gidin (sol menü)
4. **New query** butonuna tıklayın
5. `supabase-schema.sql` dosyasının **TAMAMINI** kopyalayın
6. Yapıştırın ve **RUN** butonuna tıklayın
7. "Success" mesajını görmelisiniz

### 2. CORS Ayarlarını Yapın

1. **Settings > API** (sol menü)
2. Sayfayı **aşağı kaydırın**
3. **CORS** veya **Allowed Origins** bölümünü bulun
4. Şu domain'leri ekleyin (her biri ayrı satır):
   ```
   https://www.onescrt.com
   https://onescrt.com
   ```
5. **Save** butonuna tıklayın
6. 30 saniye bekleyin

### 3. Test Edin

1. Sayfanızı açın: https://www.onescrt.com
2. **F12** tuşuna basın (Browser Console)
3. Şu mesajları görmelisiniz:
   - ✅ "Supabase client initialized"
   - ✅ "Credentials appear valid (CORS is working)"
   - ✅ "Supabase connection test successful"

## 🎉 Tamamlandı!

Artık projeniz çalışıyor olmalı. Secret gönderebilir, secret alabilir ve inbox'ı kullanabilirsiniz!

## ❓ Sorun mu var?

- **CORS hatası**: CORS ayarlarını kontrol edin
- **Table not found**: SQL şemasını çalıştırın
- **API key hatası**: script.js'deki API key'i kontrol edin

