# Yeni Supabase Projesi Kurulum Rehberi

## Adım 1: Supabase Dashboard'dan Bilgileri Alın

1. **Supabase Dashboard'a gidin**: https://supabase.com/dashboard
2. **Yeni projenizi seçin**
3. **Settings > API** sayfasına gidin
4. Şu bilgileri kopyalayın:

### Gerekli Bilgiler:

1. **Project URL** (SUPABASE_URL)
   - Örnek: `https://xxxxxxxxxxxxx.supabase.co`
   - Settings > API > Project URL

2. **anon public key** (API_KEY)
   - Settings > API > Project API keys > anon public
   - ⚠️ **service_role** key değil, **anon public** key!

## Adım 2: Bilgileri Bana Verin

Bana şunları verin:
- **SUPABASE_URL**: Yeni projenizin URL'si
- **API_KEY**: anon/public key

Örnek:
```
SUPABASE_URL: https://abcdefghijklmnop.supabase.co
API_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Adım 3: SQL Şemasını Çalıştırın

1. Supabase Dashboard > **SQL Editor**
2. `supabase-schema.sql` dosyasının içeriğini kopyalayın
3. Yapıştırın ve **Run** butonuna tıklayın
4. Tabloların oluşturulduğunu kontrol edin (Table Editor)

## Adım 4: CORS Ayarlarını Yapın

1. Settings > API sayfasına gidin
2. Sayfayı aşağı kaydırın
3. **CORS** veya **Allowed Origins** bölümünü bulun
4. Domain'inizi ekleyin:
   - `https://www.onescrt.com`
   - `https://onescrt.com`
5. **Save** butonuna tıklayın

## Adım 5: script.js Güncellenecek

Bana URL ve API key'i verdiğinizde, script.js dosyasını otomatik güncelleyeceğim.

## Notlar

- ✅ **anon/public** key kullanın (service_role değil!)
- ✅ CORS ayarları ücretsizdir
- ✅ Yeni projelerde CORS ayarları genellikle görünür
- ✅ Proje aktif olmalı (paused değil)

