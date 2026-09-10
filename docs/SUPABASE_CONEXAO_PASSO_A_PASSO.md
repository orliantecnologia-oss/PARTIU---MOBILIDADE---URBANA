# 🚀 GUIA DE CONEXÃO DO BANCO SUPABASE — PLATAFORMA PARTIU

Este documento foi preparado para você conectar seu novo projeto Supabase em **menos de 2 minutos** assim que criá-lo.

---

## 📌 PASSO 1: Criar o Projeto no Supabase
1. Acesse o console do [Supabase Dashboard](https://supabase.com/dashboard).
2. Clique em **"New project"** e selecione sua organização.
3. Preencha os dados:
   * **Name:** `partiu-mobilidade` (ou o nome de sua preferência)
   * **Database Password:** Escolha uma senha segura e guarde-a.
   * **Region:** Selecione **`South America (São Paulo) - sa-east-1`** (indispensável para latência ultrabaixa no Brasil).
   * **Pricing Plan:** Free ou Pro.
4. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos até o status ficar verde.

---

## 📌 PASSO 2: Obter as Credenciais de Acesso
No painel do projeto recém-criado:
1. No menu lateral esquerdo, clique no ícone de engrenagem ⚙️ (**Project Settings**).
2. Clique em **API** (ou **Data API**).
3. Você verá a seção **Project API keys** e **Project URL**:
   * **Project URL:** Algo como `https://abcdefghijklmnop.supabase.co`
   * **anon / public Key:** Uma chave longa começando com `eyJhbGciOi...`
   * *(Opcional)* **service_role Key:** A chave secreta (usada pelo backend/Pix).

---

## 📌 PASSO 3: Executar o Script Mestre no SQL Editor
1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (`>_`).
2. Clique em **"New query"** (ou sinal de `+`).
3. Abra o arquivo já pronto no seu projeto:
   👉 [`supabase/PARTIU_MASTER_DATABASE_SETUP.sql`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/supabase/PARTIU_MASTER_DATABASE_SETUP.sql)
4. Copie todo o conteúdo desse arquivo e cole no SQL Editor do Supabase.
5. Clique no botão verde **"Run"** (no canto inferior direito do editor SQL).
6. **Resultado esperado:** `Success. No rows returned` (todas as 11 tabelas, PostGIS, locks atômicos, procedures de split, buckets de storage e o Realtime estarão criados e ativos!).

---

## 📌 PASSO 4: Conectar ao Aplicativo
Você tem **duas opções simples**:

### Opção A: Me passar aqui no chat (Mais Rápido)
Apenas me envie uma mensagem assim:
```text
Minhas credenciais do Supabase:
URL: https://seu-projeto.supabase.co
ANON_KEY: eyJhbGciOi...
```
Eu imediatamente atualizarei o arquivo `.env` e efetuarei os testes de validação no mesmo segundo!

### Opção B: Colocar direto no arquivo `.env`
Abra o arquivo [`.env`](file:///c:/Users/Suporte/Desktop/PARTIU-%20MOBILIDADE%20URBANA/.env) e cole:
```env
VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_URL="https://seu-projeto.supabase.co"
VITE_SUPABASE_ANON_KEY="sua_chave_anon_aqui"
SUPABASE_ANON_KEY="sua_chave_anon_aqui"
```

---

## 🛡️ O QUE JÁ ESTÁ PRONTO E PREPARADO NO CÓDIGO:
* ✅ **Mecanismo de Standby/Resiliência:** O app continua abrindo normalmente em modo de espera sem quebrar enquanto as chaves não forem inseridas.
* ✅ **Realtime Channels:** Configurado para assinar o canal de despacho assim que as credenciais forem ativadas.
* ✅ **Split Contábil e Locks:** Procedures atômicas prontas no script SQL para processar corridas sem duplicidade.
* ✅ **Storage de Documentos:** Buckets para CNH, CRLV e avatares já provisionados.
