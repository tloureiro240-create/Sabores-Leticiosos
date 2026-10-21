# Sabores Leticiosos

Primeira versão do site de receitas.

## Funcionalidades
- Pesquisa de receitas online
- Criar e editar receitas próprias
- Favoritos
- Lista de compras
- Tema claro/escuro
- Layout responsivo para telemóvel e computador

Os dados pessoais ficam guardados no navegador nesta primeira versão.
Mais tarde podemos adicionar login e sincronização entre dispositivos.

## Tradução PT / FR
O seletor traduz os menus e o conteúdo das receitas, incluindo os ingredientes e os passos. As traduções são guardadas em cache no navegador; a visualização não altera as receitas originais. A pesquisa traduz a consulta para inglês para consultar o TheMealDB. A importação aceita links TikTok e YouTube e permite colar o texto completo e indicar o seu idioma. O oEmbed fornece metadados, não transcreve nem inventa os ingredientes do vídeo.

A função Netlify `translate` usa MyMemory por defeito, sujeito à quota diária desse fornecedor. Se o serviço falhar ou a quota terminar, apresenta um aviso e mantém o original. Para usar DeepL, definir `DEEPL_API_KEY` nas variáveis de ambiente do Netlify (apenas no servidor); a função distingue automaticamente chaves Free e Pro. Nenhuma chave deve ser colocada no JavaScript público.

Verificação: `node tests/translation.cjs`. Os testes usam respostas simuladas para verificar a preservação dos originais, o cache por idioma, as falhas de quota e a validação do YouTube. A tradução real depende da disponibilidade do fornecedor e requer verificação após publicação.
