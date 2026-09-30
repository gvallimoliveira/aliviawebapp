# Prints oficiais no acervo da Aliv.iA

## Resultado
- Os 10 prints enviados aparecerão na biblioteca da marca Aliv.iA como **imagens oficiais**, separados dos uploads do plano.
- Eles não consumirão vagas da cota e continuarão disponíveis para ilustrar diferenciais e cadeias de soluções.
- Cada print poderá ser fixado e ter zoom, posição, rotação e área segura ajustados no editor existente.
- Artes sem imagem continuarão sendo geradas normalmente; os prints entram apenas quando houver relação clara com o assunto.

## Organização dos prints
- **Avaliação externa por IA:** 1 print.
- **Reavaliação expressa:** 2 prints complementares.
- **Avaliação manual guiada:** 6 prints do fluxo, cobrindo anamnese, mapa de dor, intensidade/mecanismo, observações, mobilidade e dinamometria.
- **Agente de Raciocínio Clínico:** 1 print.

## Implementação
- Criar um catálogo oficial exclusivo da Aliv.iA usando os arquivos já hospedados, sem registros na tabela de fotos contabilizada pelo plano.
- Mesclar esse catálogo ao acervo visível apenas quando a marca ativa for a Aliv.iA.
- Persistir localmente o enquadramento escolhido para cada print e impedir exclusão ou alteração acidental da descrição oficial.
- Identificar visualmente essas imagens como “Oficial Aliv.iA” e separar a contagem: fotos oficiais não entram em “usadas no plano”.
- Ampliar o nexo semântico para ligar cada print somente aos diferenciais correspondentes e às etapas compatíveis dos ecossistemas.
- Manter o mesmo fluxo compartilhado de renderização e exportação PNG das demais fotos.

## Validação
- Confirmar os 10 prints na biblioteca da Aliv.iA e ausência em outras marcas.
- Confirmar que o contador do plano não aumenta.
- Testar fixação, zoom e reposicionamento de um print.
- Gerar artes dos quatro assuntos e confirmar variedade entre formatos com e sem imagem.
- Verificar visualmente a prévia e o PNG exportado.
