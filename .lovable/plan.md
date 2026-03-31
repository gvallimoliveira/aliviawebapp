

## Refinamento do PDF Básico: Nome do Paciente, Emojis EVA, Upsell e Campo de Nome

### Problemas Identificados

1. **Nome aparece como e-mail**: Em `Assessment.tsx` linha 536, `patientName={capturedEmail}` passa o e-mail como nome
2. **Escala EVA sem emojis/carinhas**: O PDF usa só barra gradiente e número, sem as carinhas de dor
3. **Bloco "Desbloqueie o resultado completo"** tem texto sobreposto e copy genérica — precisa melhorar layout