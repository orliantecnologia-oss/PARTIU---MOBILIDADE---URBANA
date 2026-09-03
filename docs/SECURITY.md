# 🛡️ UniVans TOS — Especificação de Segurança & OWASP (V4.0)

## 1. Princípios de Segurança

- **Defense in Depth:** Validação em todas as camadas (Client -> TLS -> Auth -> Tenant Context -> Input Validation -> Domain Guards -> Database Constraints -> RLS -> Audit).
- **Fail Closed:** Qualquer anomalia de autorização ou chave inválida encerra a operação com rejeição segura.
- **Redaction Automática:** Mascaramento de dados sensíveis e PII em 100% dos logs estruturados.
