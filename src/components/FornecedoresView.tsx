import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Phone, 
  Mail, 
  ExternalLink, 
  FileText, 
  ShieldCheck,
  Building2,
  Lock,
  Unlock,
  Sliders,
  DollarSign,
  Clock,
  Check
} from 'lucide-react';

export interface FornecedorConfig {
  id: string;
  nome: string;
  carteira: string; // 'Normal' | 'Aprovação Auto' | 'Coleta Auto' | 'Travado' etc.
  cnpj?: string;
  razaoSocial?: string;
  endereco?: string;
  status: 'Ativo' | 'Inativo' | 'Travado';
  prazoDias: string;
  tipoNegociacao: string;
  metodo: string;
  contatoFone?: string;
  contatoNome?: string;
  contatoEmail?: string;
  observacoes?: string;
  plataformaLink?: string;
  plataformaLogin?: string;
  plataformaSenha?: string;
  creditoGarantia?: string;
  isAutomatico: boolean; // se é automático ou normal
}

interface FornecedoresViewProps {
  theme?: 'dark' | 'light';
  itemsFornecedores: string[]; // Fornecedores extraídos dos itens da planilha
}

const DEFAULT_FORNECEDORES_CSV_DATA = `Fornecedor,Carteira,Nome Razão Social,CNPJ,Endereço,% Dev. Forn,Status ,Limite,Prazo (dias),Tipo de Negociação / Como Negociar,Aprovações,Método,Contato (fone),Contato (Nome),Contato (E-mail),Observações Importantes,Garantia: Método de negociação,Plataforma (Link),Plataforma (Login) ,Plataforma (Senha),Crédito (Contato),Crédito (Método),Credito Garantia
AABR LTDA - MATRIZ,Normal,,,"Avenida General Edgar Facó, 316  - Vila Arcadia, São Paulo - SP",,,,,,,Whatsapp Só individual,19 97149-5560,,,,,,,,,,
ACCELERATO DISTRIBUIDORA - MATRIZ,Normal,,,,,Inativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
ACCIOLY - BARÃO DE LIMEIRA,Normal,,,"Sempre enviar para AV GAL.PEDRO LEON SCHNEIDER, 99,Vide logradouro,SANTANA - 02012100",,Ativo,Indefinido ,30,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 99185-1968,,,Não negociaremos embalagens violadas de nenhuma peça eletrica,"Fazer nota pelo cfop normal, 5411 ou de acordo com a nota de entrada , avisar do envio, apos o ok enviar, não precisa do cfop 5949",,,,,,
ACCIOLY - MATRIZ,Normal,,,"Sempre enviar para AV GAL.PEDRO LEON SCHNEIDER, 99,Vide logradouro,SANTANA - 02012100",,Ativo,Indefinido ,30,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 99185-1968,,,Não negociaremos embalagens violadas de nenhuma peça eletrica,"Fazer nota pelo cfop normal, 5411 ou de acordo com a nota de entrada , avisar do envio, apos o ok enviar, não precisa do cfop 5949",,,,,,
ACCIOLY - SANTANA,Normal,,,"Sempre enviar para AV GAL.PEDRO LEON SCHNEIDER, 99,Vide logradouro,SANTANA - 02012100",,Ativo,Indefinido ,30,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 99185-1968,,,Não negociaremos embalagens violadas de nenhuma peça eletrica,"Fazer nota pelo cfop normal, 5411 ou de acordo com a nota de entrada , avisar do envio, apos o ok enviar, não precisa do cfop 5949",,,,,,
ACCIOLY - SANTO ANDRÉ,Normal,,,,,Ativo,Indefinido ,30,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 99185-1968,,,,,,,,,,
ACCIOLY - ZONA LESTE,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
ACMAX (MI5) - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 3656-0138,,,Não negociaremos embalagens violadas,,,,,,,
AKTA KIA - MATRIZ,Normal,,,,,Ativo,Indefinido ,0,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Só individual,11 99451-1162,,,,,,,,,,
ALFATEST - MATRIZ,Normal,,,,,Inativo,Indefinido ,Indefinido ,,,Whatsapp Só individual,11 3534-8887,,,,,,,,,,
ALTA BRAZ LEME (VW) - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,1196270-7977,Leo,,,,,,,,,
AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - FIAT AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - FIAT INTERLAGOS,Normal,,,"Avenida Interlagos, 665  - Vila Sao Paulo, São Paulo - SP",,,,,,,,,,,,,,,,,,
AMAZONAS - FIAT IPIRANGA,Aprovação Auto,,,,,Ativo,Indefinido ,7,Peço para que entregue a peça aqui em nossa matriz no ipiranga - entregar a peça com a NF para o guilherme na expedição mercado livre,,Whatsapp Grupo,11 98724-6849,11 95384-3734 / Thyago,,,,,,,,,
AMAZONAS - FIAT SANTANA,Normal,,,,,,,,,,,,,,,,,,,,,
AMAZONAS - FORD AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - GM AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - JEEP AMAZONAS,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,7,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 98895-6763 ,Olga,,Gerente 11 93009-0473,,Neg. Automática: Furacão,,,,,Crédito Parcial
AMAZONAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - PEUGEOT/CITROEN AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
AMAZONAS - PSA AMAZONAS,Normal,,,,,,,,,,,,,,,,,,,,,
AMAZONAS - RENAULT AMAZONAS,Normal,,,,,Ativo,Indefinido ,7,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 98895-6763 ,,,,,,,,,,
APS RADIADORES - MATRIZ,Normal,,,,,Ativo,Indefinido ,2,"Solicitar via plataforma e aguardar no e-mail para envio, atenção aos prazos",,Plataforma,,,,"Enviar via plataforma, e acompanhar por e-mail nfe o retorno , tambem pode acompanhar via plataforma",,https://www.apsdistribuidora.com.br/home,nfe@mecanizou.com,Mecanizou@123,,,
ASIPARTS - ASIPARTS,Normal,,,,,Ativo,Indefinido ,30,Enviar o print do app no grupo e aguardar o ok para o envio,,Whatsapp Grupo,11 94781-0345,Bruno,bruno.henrique@asiparts.com.br,,,,,,,,
AUTO BITTS LTDA - BELO HORIZONTE,Normal,,,,,Ativo,Indefinido ,15,enviar no grupo e aguardar ,,,,,,,,,,,,,
AUTO GT CD,Normal,,,,,Inativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
AUTO NORTE - VILA GUILHERME,Normal,,,,,Ativo,Indefinido ,15,"Toda Segunda ats as 10hs enviar por e-mail - Precisa emitir a NF antes de negociar, incluir na observação da NF o código da peça, enviar para os e-mails cadastrados ao lado e aguardar as aprovações",,Email,"gabriel.oliveira@pecabrasil.com.br, luana.brito@pecabrasil.com.br,vinicius.campos@pecabrasil.com.br,garantia.sp@pecabrasil.com.br",,garantia.sp@pecabrasil.com.br,,,,,,,,Crédito após analise 
AUTO-TEC - MATRIZ,Normal,,,"Avenida Nova Cantareira, 2511  - Tucuruvi, São Paulo - SP",,,,,,,Whatsapp Só individual,11 3337-1363,,,,,,,,,,
AUTOZONE,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar Print do app direto e aguardar,,Whatsapp Só individual,11 94723-6300,,,,,,,,,,
AUTOZONE - JOAQUINA RAMALHO,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar Print do app direto e aguardar,,Whatsapp Só individual,11 94723-6300,,,,,,,,,,
B2 Pneus Dunlop - ITAPEVI,Normal,,,"Av Engenheiro Luis Carlos Berrini, 962 - Itaim Paulista",,Ativo,Indefinido ,Indefinido ,Enviar a devolução direto no zap,,Whatsapp Só individual,11 91415-5687,Munike,sp-vendas10@b2pneus.com.br,,,,,,,,
BALI AUTO PARTS - MATRIZ,Normal,,,"R. Uruçura, 78 - Vila Antonina, SP",,Ativo,Indefinido ,Indefinido ,Enviar print no grupo e aguardar o ok para envio ,,Whatsapp Grupo,11 2306 5155,,,,,,,,,,
BELA TINTAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,3,"Enviar direto no zap, fora de grupo o print do app para solicitar a devolução",,Whatsapp Só individual,11 2596-6666,Dayane,promotor@belatintas.com.br,,,,,,,,
BR Catalisadores - Vila Palmeiras,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
BRIDA LUBRIFICANTES LTDA - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Neg fora de grupo / Juliana/Douglas,,Whatsapp Só individual,11 2100-0534 / 11 2100-0520 (Doug),Douglas,,,,,,,,,
BRITANICA - MATRIZ,Normal,,,,,Travado ,Indefinido ,0,Não aceita devoluções,,Whatsapp Só individual,11 99363-1415,,,,,,,,,,
BRITMAR IMPORTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Enviar no grupo o print dos itens a devolver e aguardar o ok,,Whatsapp Grupo,11 3798-6079, Feldman,,,,,,,,,Crédito Parcial
CAMPOS PEÇAS - MATRIZ,Normal,,,"Estr. do Alvarenga, 1290, Jardim Pedreira, SP",,Ativo,Indefinido ,Indefinido ,Enviar no grupo o print dos itens a devolver e aguardar o ok,,Whatsapp Grupo,11 98872-7704,,,,,,,,,,
CAPRICHO AUTO PEÇAS - GRANJA VIANA,Normal,,,"Rua Pacifico, 230, Granja Viana 2 - Cotia",,Ativo,Indefinido ,Indefinido ,Enviar direti no zap,,Whatsapp Só individual,11 94727-7310,,,,,,,,,,
CARBWEL,Normal,,,,,Ativo,Indefinido ,30,Enviar no grupo o print dos itens a devolver e aguardar o ok,,Whatsapp Grupo,11 96443-3877,,,,,,,,,,
CARBWEL - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,Enviar no grupo o print dos itens a devolver e aguardar o ok,,Whatsapp Grupo,11 96443-3877,,,,,,,,,,
CARQUEST - MATRIZ,Normal,,,,,Ativo,Indefinido ,15,"Enviar Print do appsheet no grupo, e aguardar ok",,Whatsapp Grupo,11 95380-6559,,,,,,,,,,
CARRERA,Normal,,,,,Ativo,Indefinido ,15,Enviar no grupo o print do itema  devolver,,Whatsapp Grupo,11 99240-4435,,,,,,,,,,
CARRERA - GM EDGAR FACO,Normal,,,,,Ativo,,15,,,,,,,,,,,,,,
CARRERA - GM EDGAR FACO,Normal,,,,,Ativo,,15,,,Whatsapp Grupo,11 98381-5203,,,,,,,,,,
carrera - matriz,Normal,,,,,Ativo,,15,,,,,,,,,,,,,,
CARRERA - NISSAN MORUMBI,Normal,,,,,Ativo,,15,Enviar no grupo o print do itema  devolver,,Whatsapp Grupo,11 99240-4435,,,,,,,,,,
CARRERA - VW ALPHAVILLE,Normal,,,,,Ativo,Indefinido ,15,Enviar no grupo o print do itema  devolver,,Whatsapp Grupo,11 99240-4435,,,,,,,,,,
CARRERA - VW VILLA LOBOS,Normal,,,,,Ativo,,15,,,,,,,,,,,,,,
CARRERA - GM OSASCO,Normal,,,,,Ativo,,15,,,,,,,,,,,,,,
CARUEME - Vila Carrão,Normal,,,,,Ativo,Indefinido ,30,"Enviar print do appsheet, foto do item e aguardar aprovação, busca de notas pelo codigo da peça",,Whatsapp Grupo,11 94789-6181,Igor,,,,,,,,,
CASA DA HR - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
CASA DA INJECAO,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
Castelhano - Cangaíba,Aprovação Auto,,,"Avenida Cangaíba, 2849, Cangaiba - São Paulo, SP",,Ativo,Indefinido ,7,,,Whatsapp Grupo,11 99616-3679,Forn ,,,,,,,,,
CASTRO PEÇAS - MATRIZ,Aprovação Auto,,,"R. Silva Bueno, 1998 - Ipiranga, São Paulo - SP, 04208-001",,Ativo,Indefinido ,7,"Enviar direto dentro do prazo, demais, negociar no grupo / enviar sempre nesse endereço R. Silva Bueno, 1998 - Ipiranga, São Paulo - SP, 04208-001, Buscar notas pelo valor",,Whatsapp Grupo,11 97611-1415,,,,,,,,,,
Castrol UNIBRAZIL,Normal,,,"Avenida Dom Pedro I, 1702  - Vila America, Santo André - SP",,,,,,,Whatsapp Só individual,11 4455-6485,,,,,,,,,,
CBC DISTRIBUIDORA DE ACESSORIOS LTDA - BIBAS,Normal,,,,,Ativo,indefinido,,Preencher formulário e enviar por e-mail,,Whatsapp Grupo,11 95958-2358,11 95958-2358 / Numero não entra em grupo / Cbc Garantia <cbcgarantia@cbcacessorios.com.br>,,,,,,,,,
CENTERPARTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,,"Enviar Print do appsheet no grupo, e aguardar ok",,Whatsapp Grupo,11 95991-2922,Josefa Chefe Sac,sac@centerparts.com.br,,,,,,,,
CENTERPARTS - MATRIZ SP,Normal,,,,,Ativo,Indefinido ,,"Enviar Print do appsheet no grupo, e aguardar ok",,Whatsapp Grupo,11 95991-2922,Josefa Chefe Sac,sac@centerparts.com.br,,,,,,,,Crédito Parcial
CENTRAL BATERIAS - MATRIZ,Normal,,,"Av Zaki narchi, 1490 - Vila Guilerme - SP",,Ativo,Indefinido ,Indefinido ,Enviar direto no zap o print dos itens a devolver,,Whatsapp Grupo,11 94054-7030,,,,,,,,,,
CHEV PEÇAS,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar Print do appsheet no grupo, e aguardar ok",,Whatsapp Grupo,11 95385 1812,,,,,,,,,,
CHEV PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar Print do appsheet no grupo, e aguardar ok",,Whatsapp Grupo,11 95385 1812,,,,,,,,,,
CJR AUTO - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
COPBOR - MATRIZ,Aprovação Auto,,,"R. Nea, 818 - Vila Ré, São Paulo - SP, 03662-000, Brasil",,Ativo,Indefinido ,15,Enviar direto,"Sem aprovação, so enviar",,1129582110,Charles,sac@copbor.com.br,,Enviar direto - 5949,,,,,,
COBRA,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,,,,,,,,,
COBRA - GUARULHOS,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - ITAQUAQUECETUBA,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - MATRIZ,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - OSASCO,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - SANTO AMARO,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - SAO BERNARDO,Aprovação + Coleta auto,,,,,Ativo,10%,15,"Precisa emitir a NF antes de negociar - enviar para a unidade de GRU, BUSCAR NOTA PELO CODIGO DA PEÇA",Não envia doc,Email ,,,Leandro - garantia10@cobrarolamentos.com.br,Temos um grupo para duvidas com o numero 11 93016-0799,"Emitir notas, e enviar a solicitação via e-mail, solicitando a validação, enviar apos a analise. todos os itens são enviados para guarulhos.",,,,,,Crédito Parcial
COBRA - BELO HORIZONTE,Normal,,,,,Ativo,,,Enviar no grupo antes de devolver,,Whatsapp Grupo,,,,,,,,,,,
COMBREK - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Enviar direto no numero e aguardar,,Whatsapp Grupo,11 2216 2686,11 95958-2358 / Numero não entra em grupo / Cbc Garantia <cbcgarantia@cbcacessorios.com.br>,,,,,,,,,
COMERCIAL PASSARELLA - MATRIZ,Normal,,,,,,,,,,,,,,,,,,,,,
COMPEL,Normal,,,,,Ativo,5%,15,"Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail, buscar notas via pedido","Sim, na NFD apenas",Módulo Negociação( Planilhas do google),11 97067-4929,Roseli,"vendassp@compel.com.br,roseli@compel.com.br","Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail",Subir no Site a solicitação e aguardar o retorno no e-mail,,,,,,Crédito Parcial
COMPEL - BARUERI,Normal,,,,,Ativo,5%,15,"Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail, buscar notas via pedido","Sim, na NFD apenas",Módulo Negociação( Planilhas do google),11 97067-4929,Roseli,"vendassp@compel.com.br,roseli@compel.com.br","Tratar situações atipicas, manter negociação por e-mail",Subir no Site a solicitação e aguardar o retorno no e-mail,,,,,,Crédito Parcial
COMPEL - MATRIZ,Normal,,,,,Ativo,5%,15,"Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail, buscar notas via pedido","Sim, na NFD apenas",Módulo Negociação( Planilhas do google),11 97067-4929,Roseli,"vendassp@compel.com.br,roseli@compel.com.br","Tratar situações atipicas, manter negociação por e-mail",Subir no Site a solicitação e aguardar o retorno no e-mail,,,,,,Crédito Parcial
COMPEL - ZONA LESTE,Normal,,,,,Ativo,5%,15,"Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail, buscar notas via pedido","Sim, na NFD apenas",Módulo Negociação( Planilhas do google),11 97067-4929,Roseli,"vendassp@compel.com.br,roseli@compel.com.br","Tratar situações atipicas, manter negociação por e-mail",Subir no Site a solicitação e aguardar o retorno no e-mail,,,,,,Crédito Parcial
COMPEL - ZONA SUL,Normal,,,,,Ativo,5%,15,"Via planilha, a mesma é atualizada e informado no grupo de whatsapp, as aprovações veem direto via e-mail, buscar notas via pedido","Sim, na NFD apenas",Módulo Negociação( Planilhas do google),11 97067-4929,Roseli,"vendassp@compel.com.br,roseli@compel.com.br","Tratar situações atipicas, manter negociação por e-mail",Subir no Site a solicitação e aguardar o retorno no e-mail,,,,,,Crédito Parcial
CRESTANA - MATRIZ,Normal,,,,,Ativo,Indefinido ,,Fornecedor não aceita devolução ,,Whatsapp Grupo,11 97636-7039,,,,,,,,,,
DASA Laguna - TATUAPÉ,Normal,,,R. da Consolação 1601 - 18 e 19 andar,,Ativo,Indefinido ,15,"Enviar direto o print dos itens a devolver , e acompanhar pois é numero de auto atendimento",,Whatsapp Só individual,8000400900,Central,,,,,,,,,
DANFAB - GUARULHOS,Normal,,,"R. Pedro Álvares Cabral, 785 - Jardim Vila Galvao, Guarulhos - SP, 07055-061, Brasil",,Ativo,,,,"Só aprova, sem Documento",,11 94702-0194,Petrick,garantia.dfb@danfab.com.br; sac@danfab.com.br,,,,,,,,
DELLAVIA PNEUS - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,,,Whatsapp Grupo,11 97112-0612,Juliana Campos,fabio.pereira@dellavia.com.br,,,,,,,,
Diauto - SBC,Aprovação Auto,,,,,Ativo,,,,,,11 99949-4507,Ivan,,,,,,,,,
DINPAR,Coleta Auto,,,,,Ativo,Indefinido ,Indefinido ,"Enviar print do app no grupo e aguarda a aprovação, imprimir e fazer a nota de acordo para fazer o envio",,Whatsapp Grupo,11 33760438,,,,,,,,,,Crédito Parcial
DINPAR - MATRIZ,Coleta Auto,,,,,Ativo,Indefinido ,Indefinido ,"Enviar print do app no grupo e aguarda a aprovação, imprimir e fazer a nota de acordo para fazer o envio",,Whatsapp Grupo,11 33760438,,,,,,,,,,Crédito Parcial
DLAMP DISTRIBUIDORA - BELENZINHO,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
DPF AUTO-PECAS LIMITADA - Matriz - DTS Parachoques,Normal,,,,,,,,,,,,,,,,,,,,,
DPK - LIMÃO,Normal,,,,,Ativo,,,Avaliando,,,,,,,,,,,,,
DTS AUTO-PEÇAS - MATRIZ,Normal,,,,,Travado ,indefinido,,somente são aceitas por defeito de fabricação ou quebra no transporte,,Whatsapp Grupo,1199213-7254,,,,,,,,,,
DUDA PARTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
DUTRAMAQUINAS - Guarulhos,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
Engecass - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
ESTOQUE MCZ - G-SHIP 2,Normal,,,,,Ativo,,,,,,,,,,,,,,,,Crédito Parcial
ESTOQUE MCZ - MATRIZ,Normal,,,,,Ativo,,,,,Whatsapp Grupo,11 98908-5947,,,,,,,,,,Crédito Parcial
ESTOQUE MCZ - ORÇAMENTISTA,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
EURO BRAKE - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
FARIA VW - RIO BRANCO,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
FERMAQUINAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,,,Whatsapp Grupo,11 7724-0450(Fiscal) / 11 96918 3378 ,,,,,,,,,,
FIAT AMAZONAS,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar no numero direto o print dos itens a devolver,,Whatsapp Só individual,11 96706-6264,,,,,,,,,,
FIAT AMAZONAS PIRITUBA - SANTANA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar no numero direto o print dos itens a devolver,,Whatsapp Só individual,11 96706-6264,,,,,,,,,,
FIAT SINAL VERGUEIRO - VERGUEIRO,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar no grupo o print do app e aguardar,,Whatsapp Grupo,1191429-8392,BRUNO,,,,,,,,,
FORDTEM - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,,,Whatsapp Só individual,11 99741-6638,,,,,,,,,,
FORT LUB PRODUTOS AUTOMOTIVOS LTDA - GUARULHOS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
FURACAO,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 95865-0034 ,Olga,,Gerente 11 93009-0473,,,,,,,
FURACAO - CAMPINAS,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 95865-0034 ,Olga,,Gerente 11 93009-0473,,,,,,,Crédito Parcial
FURACAO - MATRIZ,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 95865-0034 ,Olga,,Gerente 11 93009-0473,,,,,,,Crédito Parcial
FURACAO - PARQUE NOVO MUNDO,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 95865-0034 ,Olga,,Gerente 11 93009-0473,,,,,,,Crédito Parcial
FURACAO - ZONA OESTE,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,11 95865-0034 ,Olga,,Gerente 11 93009-0473,,,,,,,Crédito Parcial
FURACAO - SANTO ANDRÉ,Normal,,,Enviar sempre a Santana,,Ativo,Indefinido ,15,"Mandar Printo do app no grupo, apos fazer a nota de acordo com a autorização, aguardar o ok para envio todos os itens na mesma nota","Sim, impressa com NFD",Whatsapp Grupo,,,,Gerente 11 93009-0473,"gerar as notas e enviar no grupo, itens acima de 100,00 vão ser retirados no estoque.",,,,,,Crédito Parcial
G&B PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,"Usar planilha automatica para extrair e Mandar no e-mail em excel e pdf, com os codigos G&B de cada item, e aguardar receber as aprovações, não precisa mandar as aprovações, apenas por no corpo da nota os numeros delas",,Email,,,,,Enviar por e-mail e aguardar as aprovações,,,,,,Crédito Parcial
GALPAO PEÇAS,Aprovação Auto,,,,,Ativo,Indefinido ,15,"Enviar itens se estiver dentro do mês, caso esteja fora, enviar no grupo para aprovação, buscar notas pelo valor",,Whatsapp Grupo,11 95462-5830 ,,,,cfop 5949,,,,,,Crédito Parcial
GALPAO PEÇAS - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,15,"Enviar itens se estiver dentro do mês, caso esteja fora, enviar no grupo para aprovação, buscar notas pelo valor",,Whatsapp Grupo,11 95462-5830 ,,,,cfop 5949,,,,,,Crédito Parcial
GERALPARTS - MATRIZ,Normal,,,"R.Sebastião Paes 499, campo belo",,Ativo,Indefinido,15,Preencher formulário que está no grupo,,Whatsapp Grupo,11 93201-4806,Marcos,,,,,,,,,
GETSET - MATRIZ,Normal,,,,,Ativo,Indefinido,15,"Enviar no grupo print com itens a devolver, apos o ok fazer o envio",,Whatsapp Grupo,11 97412-9991 ( Solicitei a entrada no grupo,,,,,,,,,,
GP FRANCE - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,,,,,,,,,,,,,,
GRUPO CAOA - ANHAIA MELO,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - CHERY BERRINI,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - CHERY MORUMBI,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - CHERY PERDIZES,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO CAOA - CHERY RADIAL LESTE,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - CHERY SANTO ANDRE,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - CHERY VILA GUILHERME,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - FORD ANHANGUERA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 94549-9878,Caique,caique.silva@caoa.com.br,,,,,,,,
GRUPO CAOA - FORD CEASA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - FORD JABAQUARA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - FORD JARAGUA (ANTIGO ANHANGUERA),Normal,,,"Avenida Jornalista Paulo Zingg, 314",,Ativo,Indefinido ,Indefinido ,"Envia a solicitação com print da tela - enviar para o endereço: Avenida Jornalista Paulo Zingg, 314",,Whatsapp Só individual,11 94549-9878,Caique,,,,,,,,,
GRUPO CAOA - FORD PAULINVEL,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO CAOA - HB ANHAIA MELO,Normal,,,,,Ativo,indefinido,,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HB CEASA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HB ERMANO MARCHETTI,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HB IPIRANGA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HB SANTANA,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HB SANTO ANDRE,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HYUNDAI IMARÉS,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - HYUNDAI RAPOSO TAVARES,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Envia a solicitação com print da tela e motivo / prazo 7 dias,,Whatsapp Só individual,11 91327-5450,Pedro,,,,,,,,,
GRUPO CAOA - SUBARU MORUMBI,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO COMOLATTI - BARUERI,Normal,,,,,Ativo,Indefinido ,15,Fora de grupo via whasapp,,,,,,,,,,,,,
GRUPO COMOLATTI - DASA TATUAPÉ,Normal,,,,,Ativo,Indefinido ,15,Fora de grupo via whasapp,,Whatsapp Só individual,8000200700,Central,,,,,,,,,
GRUPO COMOLATTI - FILIAL LESTE,Normal,,,,,Ativo,Indefinido ,15,Fora de grupo via whasapp,,Whatsapp Só individual,8000200700,,,,,,,,,,
GRUPO DAHRUJ - FIAT VENTUNO,Normal,,,,,Ativo,Indefinido ,7,,,,,,,,,,,,,,
GRUPO DAHRUJ - JEEP CEASA,Normal,,,,,Ativo,Indefinido ,7,,,,,,,,,,,,,,
GRUPO GRAND BRASIL - HYUNDAI BARRA FUNDA,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO GRAND BRASIL - HYUNDAI GUARULHOS,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO GRAND BRASIL - TOYOTA,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO GRAND BRASIL - TOYOTA JURUBATUBA,Normal,,,,,"Enviar no grupo print com itens a devolver, apos o ok fazer o envio",,Whatsapp Só individual,11 5681-0057,,,,,,,,,,
GRUPO REAL,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,Crédito Parcial
GRUPO REAL - MATRIZ,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,Crédito Parcial
GRUPO REAL - CAMPINAS,Normal,,,Por filial,,Ativo,10%,30,,,,,,,,,,,,,,
GRUPO REAL - SÃO BERNARDO,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,Crédito Parcial
GRUPO REAL - ZONA LESTE,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,Crédito Parcial
GRUPO REAL - ZONA NORTE,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,Crédito Parcial
GRUPO REAL - BELO HORIZONTE,Normal,,,Por filial,,Ativo,10%,30,"Usar a planilha automatica, e solicitar as aprovações, as mesma vem por e-mail apos so seguir com os envios","Sim, na NFD apenas",Whatsapp Grupo,34 9944-5613,Liniker,,34 8862-3394 ( Nayara),,,,,,,
GRUPO SINAL,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT CORIFEU,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT RUBEM BERTA,Normal,,00.434.116/0006-43,"Avenida Rubem Berta, 1120, Indianópolis - São Paulo, SP",,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT SANTO AMARO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT SAO BERNARDO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT TANCREDO NEVES,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT VERGUEIRO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - CITROEN PEUGEOT VERGUEIRO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - PSA TANCREDO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - PSA PINHEIRO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - HYUNDAI CARANDIRU,Normal,,,,,Ativo,indefinido,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - HYUNDAI SAO CAETANO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - HYUNDAI DIADEMA,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - Honda Mix SBC,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - MATRIZ,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - NISSAN ARICANDUVA,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - NISSAN OSASCO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT ARICANDUVA,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT INDIANOPOLIS,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT NAÇÕES UNIDAS,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT OSASCO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT JOAO DIAS,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT ALPHAVILLE,Normal,,,,,Ativo,,7,"Mandar No grupo o print do app e apos ok seguir com as devoluções, BUSCAR NOTA COD DA PEÇA","Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - RENAULT ADOLFO PINHEIRO,Normal,,,,,Ativo,,7,"Mandar No grupo o print do app e apos ok seguir com as devoluções, BUSCAR NOTA COD DA PEÇA","Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - JEEP SACOMA,Normal,,,,,Ativo,,7,"Mandar No grupo o print do app e apos ok seguir com as devoluções, BUSCAR NOTA COD DA PEÇA","Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT FCO MORATO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FIAT ALPHAVILLE,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FORD MIX ALPHAVILLE,Normal,,59.286.583/0003-73,"Alameda Rio Negro, 400, Alphaville Industrial - Barueri, SP",,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - FORD MIX,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - JEEP SAO BERNARDO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - HYUNDAI ANALIA FRANCO,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO SINAL - JEEP ALPHAVILLE,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
GRUPO STEFANINI - OSASCO,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GRUPO TORIBA - JEEP AGUA BRANCA,Normal,,,,,Ativo,Indefinido ,7,,,,,,,,,,,,,,
GRUPO TORIBA - RENAULT PIRITUBA,Normal,,,,,Ativo,Indefinido ,15,,,Whatsapp Só individual,11 97049-9312,Luiz Fernando,,,,,,,,,
GOOP DISTRIBUIDORA (TAKAO) - MATRIZ SP,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GOOP DISTRIBUIDORA (TAKAO) - CAMPINAS,,,,,,Ativo,,,,,,,,,,,,,,,,
GOOP DISTRIBUIDORA (TAKAO) - SAO BERNARDO DO CAMPO,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
GT3 PEÇAS - TATUAPÉ,Normal,,,"av. Alvaro ramos, 1904-Quarta parada",,Ativo,Indefinido ,Indefinido ,Mandar No privado o print do app e apos ok seguir com as devoluções,,Whatsapp Só individual,11 95146-0968,,,,,,,,,,
GoParts,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
HG BORRACHAS - VILA MARIA,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
honda sampa,Normal,,,,,Inativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
honda sampa - MATRIZ,Normal,,,,,Inativo,,,,,,,,,,,,,,,,
HORIZONTE AUTO PEÇAS - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,Se as peças estiverem ok so enviar,,,,,,,,,,,,,Crédito Parcial
Hyundai Sinal - Carandiru,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
IMCAR - MATRIZ,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
INTER JAPAN (GASTAO) - Matriz,Normal,,,"Avenida Doutor Gastão Vidigal, 1457  ,  11 98149-0956  - Vila Leopoldina, São Paulo - SP",,Ativo,Indefinido,,,,Whatsapp Grupo,11 98149-0956,,,,,,,,,,
ISAPA DISTRIBUIDORA - MATRIZ,Coleta Auto,,,,,Ativo,Indefinido ,Indefinido ,"Whatsapp direto, não esta em grupo","Sim, na NFD apenas",Whatsapp Só individual,11 99235-0110,Uirapuã,,,,,,,,,
IVECOMPANY - VILA GUILHERME,Normal,,,,,Ativo,Indefinido ,,,,,,,,,,,,,,,
JAHU - FILIAL SP,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar e-mail automático, apo´s avaliar no app os itens em condição de negociar,aguardar o retorno por e-mail, por na nota numero da aprovação e avaliar o NCM antes de emitir, não precisa gramper as aprovações.","Sim, na NFD apenas",Email ,sac@jahu.com.br ,,,,,,,,,,Crédito Parcial
JAHU - MATRIZ SP,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar e-mail automático, apo´s avaliar no app os itens em condição de negociar,aguardar o retorno por e-mail, por na nota numero da aprovação e avaliar o NCM antes de emitir, não precisa gramper as aprovações.","Sim, na NFD apenas",Email ,sac@jahu.com.br ,,,,,,,,,,Crédito Parcial
JAHU - FILIAL,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar e-mail automático, apo´s avaliar no app os itens em condição de negociar,aguardar o retorno por e-mail, por na nota numero da aprovação e avaliar o NCM antes de emitir, não precisa gramper as aprovações.","Sim, na NFD apenas",Email ,sac@jahu.com.br ,,,,,,,,,,Crédito Parcial
JAHU - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar e-mail automático, apo´s avaliar no app os itens em condição de negociar,aguardar o retorno por e-mail, por na nota numero da aprovação e avaliar o NCM antes de emitir, não precisa gramper as aprovações.","Sim, na NFD apenas",Email ,sac@jahu.com.br ,,,,,,,,,,Crédito Parcial
JAPANPARTS - MATRIZ,Aprovação Auto,FAST LUBE FILTROS E PECAS LTDA,71.810.931/0001-01,"Av. Dr. Mauro Lindemberg Monteiro, 185 - Santa Fé, Osasco - SP, 06278-010 Galpão 8 - Fast Lube.",,Ativo,,30,"Gerar a NF e enviar, não pode ter marcas de uso nem mais de 30 dias da compra, so se for garantia",,Automatico,11 94195-1803,Pedro,atendimento@clubedofiltro.com.br,,,,,,,,Crédito Parcial
JB Autopeças - Matriz,Normal,,,,,Ativo,,7,", enviar no grupo o print e aguardar ok, Busca de notas por codigo peça",,Whatsapp Grupo,11 3981-5302,Central de atendimento,,,,,,,,,Crédito Parcial
JEEP DAHRUJ - CEASA - FIAT VENTUNO,Normal,,,,,,,,"Prazo 7 dias para devolução. Garantia, enviar qual a peça no whats e aguardar retorno",,Whatsapp Só individual,11 96923-8168,,,,,,,,,,
JL IMPORTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar print do app no grupo e aguardar,,Whatsapp Grupo,11 96487-5294,Leo,,,,,,,,,
JOCAR - BUTANTÃ,Normal,,,,,,,,,,,,,,,,,,,,,
JOSECAR,Aprovação Auto,,,,,Ativo,10%,30,Mandar mumero do pedido junto quando enviar solicitação de devolução ,,Whatsapp Só individual,11 94302-0898,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - AGUA FRIA,Aprovação Auto,,,,,Ativo,10%,30,Mandar mumero do pedido junto quando enviar solicitação de devolução ,,Whatsapp Grupo,11 94287-6465,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - BUTANTA,Aprovação Auto,,,,,Ativo,10%,30,"Se itens em condição, so enviar a filial",,Whatsapp Grupo,11 94302-0898,,devolucao.butanta@josecar.com.br,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - FREGUESIA DO Ó,Aprovação Auto,,,,,Ativo,10%,30,"Se itens em condição, so enviar a filial",,Whatsapp Grupo,11 96785-3191,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - JABAQUARA,Aprovação Auto,,,,,Ativo,10%,30,Enviar o print do app no Grupo e aguardar,,Whatsapp Grupo,11 98314-6373,,,Manter Romaneio e Data de compra no rodape,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - LAPA,Aprovação Auto,,,,,Ativo,10%,30,"Se itens em condição, so enviar a filial, BUSCAR NOTA PELO NOSSO PEDIDO",,Whatsapp Grupo,11 96776-6031,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - OSASCO,Aprovação Auto,,,,,Ativo,10%,30,"Se itens em condição, so enviar a filial",,Whatsapp Só individual,11 95998-2584,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,,,,Crédito Parcial
JOSECAR - REGENTE FEIJO,Aprovação Auto,,,,,,,,,,,,,,,,,,,,,Crédito Parcial
JOSECAR - TATUAPE,Aprovação Auto,,,,,Ativo,10%,30,"Enviar o print do app no Grupo e aguardar, BUSCAR NOTAS PELO VALOR",,Whatsapp Grupo,11 97740-3131,,,,Envia a solicitação por e-mail para cada filial junto com o motivo. A filial vai informar quando precisar de algo além da NF ,,,Mecanizou,,,Crédito Parcial
JUNA MOTORES - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
KDM PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar o print do app no Grupo e aguardar,,Whatsapp Grupo,11 94558-0877,,,,,,,,,,
KINGIMPORTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,,Enviar o print do app no Grupo e aguardar,,Whatsapp Grupo,1196602-0939,,,Pode ter venda nesse 56.121.815/0001-83,,,,,,,
KOREA PARTS HYUNDAI E KIA - ANCHIETA,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
KOVI - JURUBATUBA,Normal,,,,,Inativo,,,,,,,,,,,,,,,,
Lequipe - MATRIZ,Normal,,,,,Atenção ao prazo,Indefinido ,2,,,Whatsapp ,11 98543-9222,,,,,,,,,,
LOJA DO MECANICO,Normal,,,,,Atenção ao prazo,Indefinido ,7,,,Whatsapp,11 3508-9979 ,,davidsonbenedicto@lojadomecanico.com.br,,,,,,,,
LOJA DO MECANICO - JUNDIAI,Normal,,,,,Atenção ao prazo,Indefinido ,7,,,,,,,,,,,,,,
LOJA DO MECANICO - MATRIZ,Normal,,,,,Atenção ao prazo,Indefinido ,7,,,,,,,,,,,,,,
LUBPAR,Normal,,,,,,,,,,,,,,,,,,,,,
LUCIOS - AUTOLUC,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Endereço de envio e retirada de devoluções : Rua Joaquina de Jesus, 141.",,Automatico ,11 2905-6704,,,Possuem grupo no whatsapp,"Na aba de negociação de devoluçãp da Lucios possui uma aba para negociação de garantia, onde colocamos as solicitações e o fornecedor aprova de 15 em 15 dias, a emissão fiscal deverá ser realizada de acordo com a aprovação (todos os itens na mesma nota com CFOP 5949)",http://portal.lucios.com.br/Login.aspx,37199406000155,MEC2024@LO,,,Crédito Parcial
LUCIOS,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
LYON PARTS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,1194736 4111,,,,,,,,,,
M3 IMPORTS,Normal,JANILE SOUZA CERQUEIRA FIRMINO 32582330809,28.734.292/0001-05,"Avenida Deputado Cantídio Sampaio, 4780, Vila Souza - São Paulo, SP",,Ativo,,,,,(11) 2539-5240,11 2539-5240,Alisson,,,,,,,,,
MACROCAR - MATRIZ,Normal,,,,,Ativo,Indefinido ,,,,Whatsapp Grupo,11 4395-9973,Vitor Hugo,,,,,,,,,
Mahovi - MATRIZ,Normal,,,,,Ativo,Indefinido ,,,,,,,,,,,,,,,
MAISLUB - MATRIZ,Normal,,,,,Ativo,Indefinido ,,,,,,,,,,,,,,,
MÁQUINAS RIBEIRO - MATRIZ,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
MASTRA PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,1197027-2925,,,,,,,,,,
MATARAZZO IMPORTS - JABAQUARA,Normal,,,,,,,,,,,,,,,,,,,,,
MATARAZZO IMPORTS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
MC MOLAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
MCLARTY - MATRIZ,Normal,,,,,Ativo,,,,,Whatsapp Só individual,11 98203-4952,,,,,,,,,,
MCLARTY MAIA - CHRYSLER/JEEP/DODGE (BARRA FUNDA),Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
MCLARTY MAIA - TOYOTA (PACAEMBU),Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Só individual,11 98203-4952,,,,,,,,,,
MDM PARTS - SANTO ANDRE,Normal,,,,,,,,,,,,,,,,,,,,,
MEC-LAN - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Só negocia fora, não em grupo",,Whatsapp Grupo,1194007-9148,,,,,,,,,,
MELI,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
Mello Auto Peças - Mello Auto Peças,Aprovação Auto,,,"Avenida Doutor Luís Rocha Miranda, 206/210  - Jabaquara, São Paulo - SP",,Ativo,,,"Apenas enviar os itens que estão em condição de serem revendidos., BUSCAR NOTAS PELO VALOR","Sem aprovação, so enviar",Whatsapp Grupo,11 5013-9987,,,,,,,,,,Crédito Parcial
MEMORIAL FORD - MEMORIAL FORD,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,1198503-2173,,,,CFOP 5949 - 90 dias.,,,,,,
MERCADO LIVRE - MATRIZ,Normal,,,,,Inativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
Mercado Livre ITA PEÇAS,Normal,,,,,Inativo,,,,,,,,,,,,,,,,
MERCADOCAR,Aprovação Auto,,,,,Ativo,5%,30,,,Whatsapp Grupo,11 97608-2539 ,,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - ARICANDUVA,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,,,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - BARRA FUNDA - LINHA LEVE,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar, BUSCAR NOTA PELO PEDIDO",,,,,,,,,,,,,Crédito Parcial
MERCADOCAR - BARRA FUNDA - LINHA PESADA,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar, BUSCAR NOTA PELO PEDIDO",,,,,,,,,,,,,Crédito Parcial
MERCADOCAR - GUARULHOS,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - GUARULHOS CENTRO,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - MARECHAL TITO,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - MATRIZ,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - OSASCO,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - PIMENTAS,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - SANTO AMARO,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - SANTO ANDRE,Aprovação Auto,,,,,Ativo,5%,30,"Itens ok, so enviar",,Whatsapp Grupo,11 91399-7930,garantias,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
MERCADOCAR - TUCURUVI,Normal,,,,,Travado ,5%,30,Temos uma quantidade grande a abater ainda la no fornecedor,,Whatsapp Grupo,11 94361-1068,Rodrigo,,,Contato Garantia = 11 91399-7930,,,,,,Crédito Parcial
METALSYSTEM - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,Enviar e-mail e aguardar a aprovação,"Sim, na NFD apenas",Email ,11 98346-7969,,garantia@metalsystem-pecas.com.br,,"Envia a solicitação por e-mail, preenche o formulário que o fornecedor nos passou e envia a peça junto com a NF de remessa (cfop5949) e o formulario ",,,,,,Crédito após analise 
MILTPARTS - MATRIZ,Normal,,,"Rua Norma piericcini giannotti, 611 / 569- varzea da barra funda",,Ativo,Indefinido ,14,,,Whatsapp Só individual,11 3797-7200,Ygor,TPARTS <fiscal@tparts.com.br>,,,,,,,,
MOHAMMED PNEUS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
MOLINA PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,11 2014-8640 / 11 94737-1791,,,,,Ecomerce G&B,37199406000155,Mecanizou123,,,Crédito Parcial
Motor Imports - MATRIZ,Normal,,,,,Ativo,Indefinido ,3,Enviar via plataforma e aguardar o retorno,,Whatsapp Grupo,1137383742,,,,,https://www.motorsimports.com.br/solicita-devnaplicada,,,,,
MOTORFORT - VILA MARIA,Aprovação Auto,,,,,Ativo,Indefinido ,7,"Enviar print do appsheet no grupo e aguardar o ok, Pedido ou Codigo da peça","Sem aprovação, so enviar",Whatsapp Grupo,11 95346-0459,Tuany,,,"Enviar o formulário no e-mail = Garantia@motorfort.com.br
Link Fotmulário -https://docs.google.com/document/d/1-O3sqL8qrvaPZOk2WaT8UycqKXQCJ4_PK2zuiOYbqVs/edit?tab=t.0",,,-,,,Crédito após analise 
MOTORSHARP - JARDIM PRUDENCIA,Aprovação Auto,,,"Rua Albuquerque Sousa Muniz, 62 - Vila Alexandria",,Ativo,Indefinido ,7,Enviar print do appsheet no grupo e aguardar o ok,,Whatsapp Grupo,11 95346-0459,Tuany,,,,,,,,,
Motul - MATRIZ,Normal,,,,,Ativo,Indefinido ,,São Paulo - SP - CEP 04635-010,,Whatsapp Só individual,11 99375-8456,,,,,,,,,,
MS LUB - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NISSAN CARRERA - BUTANTÃ,Normal,,,,,Ativo,Indefinido ,15,,,,,,,,,,,,,,
NISSAN CARRERA - MATRIZ,Normal,,,,,,,15,,,,,,,,,,,,,,
NISSAN SINAL JAPAN - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NOREIKA - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NOVA CHEVROLET - BELENZINHO,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar print do appestoque no grupo e aguardar o ok - enviar no endereço da filial de Belenzinho, buscar notas pelo codigo ou valor",,Whatsapp Grupo,11 94360-1214,,,,,,,,,,Crédito Parcial
NOVA CHEVROLET - SANTO AMARO,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar print do appestoque no grupo e aguardar o ok - enviar no endereço da filial de Belenzinho, buscar notas pelo codigo ou valor",,Whatsapp Grupo,11 94360-1214,,,,,,,,,,Crédito Parcial
NOVA CHEVROLET - IPIRANGA,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Enviar print do appestoque no grupo e aguardar o ok - enviar no endereço da filial de Belenzinho, buscar notas pelo codigo ou valor",,Whatsapp Grupo,11 94360-1214,,,,,,,,,,Crédito Parcial
NOVA GM,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NOVA INJEÇÃO PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NOVA VEICULOS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
NPX DISTRIBUIDORA - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Enviar no grupo e aguardar o ok para envio,"Só aprova, sem Documento",Whatsapp Grupo,1199773-3537,Central,,,,,,,,,
ORIGINAL FORD - MATRIZ,Normal,MERCANTIL DISTRIBUIDORA DE VEICULOS LTDA,59.286.583/0001-01,"RUA ALAGOAS,41, CENTRO - 09521050 SAO CAETANO DO SUL",,,,,,,,1142249000,,,,,,,,,,
ORIGINAL LUBRIFICANTES - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
ORIGINAL VEICULOS - FIAT GUARULHOS,Normal,,,,,Ativo,,,,,Whatsapp Grupo,11 94009-4447,Anderson,,,,,,,,,
ORIGINAL VEICULOS - FIAT ITAQUERA,Normal,,,"Avenida Pires do Rio, 2500  - Vila Verde, São Paulo - SP",,,,,,,,,,,,,,,,,,
ORIGINAL VEICULOS - FIAT TIMOTEO PENTEADO,Normal,,,,,,,,,,Whatsapp Só individual,11 94009-4447,,,,,,,,,,
ORIGINAL VEICULOS - VW GUARULHOS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,55 11 98460-134,,,,,,,,,,
ORION IMPORTS - SÃO CAETANO DO SUL,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
PACCINI - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,"Apos enviar na plataforma, eles pedem a nota por e-mail, apos o envio, aguardar a aprovação",,Plataforma ,,,,,,https://checkout.paccini.com.br/Login/Authenticate,evelyn.freitas@mecanizou.com,Mecanizou.2023,,,
PACCINI - MACROCAR,Normal,,,,,Ativo,Indefinido ,7,"Enviar no grupo conforme as informações do formulario, aguardar os tramitis no e-mail ate o ok de envio, no grupo ja tem o modelo a enviar em pdf",,Whatsapp Grupo,11 2842-1493,Cleyton,vendas57@paccini.com.br,,Emviar no zap (11) 2842-1499.,,,,,,
PALMICAR - MATRIZ,Normal,,,,,Ativo,indefinido,,Enviar print no grupoe  aguardar o ok,,Whatsapp Grupo,11 91853-3192,Daniela,,,,,,,,,Crédito Parcial
PanPeças,Normal,,,,,,,,,,,,,,,,,,,,,
PanPeças - Matriz Brasilândia,Normal,,,,,,,,,,,,,,,,,,,,,
PanPeças - Vila Zat,Normal,,,,,Ativo,indefinido,7,"Mandar Print no grupo, buscar notas pelo valor",,Whatsapp Grupo,11 98093-1838,,,,,,,,,,Crédito Parcial
PEÇAHOJE - IPIRANGA,Normal,,,,,Ativo,Indefinido ,,,,,,,,,,,,,,,
PELLEGRINO - Barueri,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,-,-,,,
PLANATC TECNOLOGIA - MATRIZ,Normal,,,"Rua Azevedo Soares, 97  - Vila Gomes Cardim, São Paulo - SP",,,,,,,Whatsapp Só individual,11 99202-5861,,,,,,,,,,
PNEUS AMORIM - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,11 94872-5084,,,,,,,,,,
PONTO VW PEÇAS,Normal,,,,,,,,,,,,,,,,,,,,,
POTENTE BRASIL - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Só individual,11 94032-1617,,,,,,,,,,
PontoCom Auto Peças - Ponto.Com,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,"Enviar no grupo, itens a devolver, e aguardar ok","Só aprova, sem Documento",Whatsapp Grupo,11 95764-8606,Central,,,,,,,,,
PontoCom Auto Peças - Leves e Pesados,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,"Enviar no grupo, itens a devolver, e aguardar ok","Só aprova, sem Documento",Whatsapp Grupo,11 95764-8606,Central,,,,,,,,,
PRIMO VINI AUTO PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido,15,Enviar print no grupo e  aguardar o ok,,Whatsapp Grupo,11 94996-1174,,,,,,,,,,Crédito Parcial
RATEIRO - MATRIZ,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
Raven Ferramentas - KING TONY,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
REAL PARIS PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,"Só aprova, sem Documento",,11 95157-3299,Jonatas,,,,,,,,,Crédito após analise 
RENOTECH - OSASCO,Normal,,,,,Ativo,Indefinido ,2,,,Whatsapp Só individual,11 99518-5412,Rodrigo,,,,,,,,,
RENOTECH - SANTO AMARO,Normal,,,,,Ativo,Indefinido ,2,,,,,,,,,,,,,,
RENOTECH - TATUAPÉ,Normal,,,,,Ativo,,2,,,,,,,,,,,,,,
RENOVA ECOPECAS - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,-,,,,,,,,,Renova Ecopeças,,,,,
ROLEMAR - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,,,Whatsapp Grupo,11 33776201,Nathalia Tavares,,,,,,,,,
Romauto Parts - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
ROYAL LUBRIFICANTES - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Só individual,11 95806-2624,Erick,,,,,,,,,
RPOINT,Normal,,,,,Ativo,Indefinido ,15,,,Whatsapp Grupo,11 96916-2474 - Andreza,,,,,,,,,,
RPOINT - BRAS LEME,Normal,,,,,Ativo,Indefinido ,15,,,Whatsapp Grupo,,,,,,,,,,,
RPOINT - IPIRANGA,Normal,,,,,Ativo,Indefinido ,15,,,Whatsapp Grupo,,,,,,,,,,,
RPOINT - VILA GUILHERME,Normal,,,,,Ativo,Indefinido ,15,,,Whatsapp Grupo,,,,,,,,,,,
RR Parts - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
RUFATO PEÇAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,11 98500-4335,Ryan,,,,,,,,,
RV PEÇAS,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,Whatsapp Grupo,11 91942-4971,,,,,,,,,,
SANTANA FERRAMENTAS AUTOMOTIVAS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
SBCPEÇAS,Normal,,,,,,,,,,,,,,,,,,,,,
SEM INFORMAÇÃO,Normal,,,,,,,,,,,,,,,,,,,,,
SERRAF,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
SERRAF - MATRIZ,Normal,,,,,Ativo,10%,30,,,Whatsapp Grupo,11 94009-9770,Taina,,,,,,,,,
SERRAF - MATRIZ - CASA VERDE,Normal,,,,,Ativo,10%,30,,,Whatsapp Grupo,11 94009-9770,Taina,,,,,,,,,
shell - matriz,Normal,,,,,Ativo,indefinido,,LUBPAR COMERCIO ATACADISTA DE LUBRIFICANTES LTDA,,Whatsapp Grupo,11 93433-1634,,,,,,,,,,
SIGMA TOOLS - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
SIM LUBRIFICANTES - MATRIZ (ESTEIO),Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
SIM LUBRIFICANTES - SANTO ANDRE,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
SK MOBILITY,Aprovação Auto,,,,,Ativo,10%,15,,,Whatsapp Grupo,11 94040-3195,Luiz Henrique,,,,,,,,,Crédito Parcial
SK MOBILITY - MATRIZ,Aprovação Auto,,,,,Ativo,10%,15,,,Whatsapp Grupo,11 94040-3195,Luiz Henrique,,,,,,,,,Crédito Parcial
SK MOBILITY - VILA MARIA (GM),Aprovação Auto,,,,,Ativo,10%,15,,,Whatsapp Grupo,11 94040-3195,Luiz Henrique,,,,,,,,,Crédito Parcial
SK MOBILITY - ZONA OESTE,Aprovação Auto,,,,,Ativo,10%,15,,,Whatsapp Grupo,11 94040-3195,Luiz Henrique,,,,,,,,,Crédito Parcial
SK MOBILITY - ZONA OESTE ( ESTOQUE GM),Aprovação Auto,,,,,Ativo,10%,15,,,Whatsapp Grupo,11 94040-3195,Luiz Henrique,,,,,,,,,Crédito Parcial
SKY AUTOMOTIVE,Normal,,,,,Ativo,Indefinido ,30,,"Só aprova, sem Documento",Whatsapp Grupo,11 96214-1017,,adm04.sp@skyautomotive.com.br,,,,,,,,Crédito após analise 
SKY AUTOMOTIVE - BOM RETIRO,Aprovação Auto,,,,,Ativo,Indefinido ,30,"Fazer as validações se temos alguma pendencia, e se tudo estiver ok, enviar 1 x na semana","Só aprova, sem Documento",Whatsapp Grupo,11 96214-1017,Katia,adm02.sp@skyautomotive.com.br,"Validar se existem pendencias, resolver, pedir novo envio e após ok, so enviar",,,,,,,Crédito após analise 
SKY AUTOMOTIVE - GUARULHOS,Aprovação Auto,,,,,Ativo,Indefinido ,30,Enviar de 10 em 10 itens or dia no maximo,"Só aprova, sem Documento",Whatsapp Grupo,11 95848-3678,,,,,,,,,,Crédito após analise 
SKY AUTOMOTIVE - JURUBATUBA,Aprovação Auto,,,,,Ativo,Indefinido ,30,"Enviar por e-mail o printo do appshee, e aguardar aprovações","Sim, na NFD apenas",Email,,,adm02.sp@skyautomotive.com.br,,,,,,,,Crédito após analise 
SKY AUTOMOTIVE - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,30,,"Só aprova, sem Documento",,,,,,,,,,,,Crédito após analise 
SKY AUTOMOTIVE - SANTO AMARO,Aprovação Auto,,,,,Ativo,Indefinido ,30,"Enviar por e-mail o printo do appshee, e aguardar aprovações","Sim, na NFD apenas",Email,,,,,,,,,,,Crédito após analise 
SKY AUTOMOTIVE - BELO HORIZONTE,Normal,,,,,Ativo,Indefinido ,30,,,,,,,,,,,,,,
SKY AUTOMOTIVE - CONTAGEM MG,Normal,,,,,Ativo,Indefinido ,30,,,,,,,,,,,,,,
STARKE PREMIUM PARTS - Starke,Normal,,,"Rua Américo Brasiliense, 2414  - Chácara Santo Antônio (Zona Sul), São Paulo - SP",,Ativo,Indefinido ,30,,,Whatsapp Só individual,11 4102-1202 / 11 93943-9335 ,,,11 976167461 - garantia,,,,,,,
STELLER PEÇAS - MATRIZ,Normal,,,"Rua Iapó, 101 - Casa verde SP",,Ativo,Indefinido ,Indefinido ,Enviar o print do app no grupo e aguardar o ok para envio,,Whatsapp Grupo,11 94784-4171,,,,,,,,,,
STREET SOLUTIONS - MATRIZ,Normal,,,"Avenida Conselheiro Rodrigues Alves, 1083, Vila Mariana - São Paulo, SP",,Ativo,Indefinido ,Indefinido ,"Enviar no whatsapp o print do item, deve estar em condição de novo",,Whatsapp Grupo,11 94161-3309,Central,,CNPJ 13.863.621/0001-40,,,,,,,
SUPPORT LUBRIFICANTES,Normal,,,,,,,,,,,,,,,,,,,,,
SUPPORT LUBRIFICANTES - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,,,,,,,,,,,,,,
SUZUCAR - MATRIZ,Normal,,,,,Ativo,Indefinido,,"Numero de zap direto, fora de grupo",,Whatsapp Grupo,11 99604-4012,,,,,,,,,,
TEKCOM - TEKCOM,Normal,,,,,Inativo,,,,,,,,,,,,,,,,
TONINI - ITABERABA,Normal,,,,,Ativo,Indefinido ,90,"Atualizar os itens na planilha automatica e informar no grupo, após aguardar a aprovação",,Whatsapp Grupo,11 94132-9992 ,,,,"Mesmo fluxo da devolução normal, cfop 5411, so solicitar via 5949 quando for necessário Laudo para ressarcimento de valor de mão de obra ou algo do tipo.",,,,,,Crédito Parcial
TOULOUSE IMPORT - MOEMA,Normal,,,"AV santo amaro, 2080, vila nova conçeição - SP",,Ativo,Indefinido ,30,Enviar print do app no grupo e aguardar o ok para envio,,Whatsapp Grupo,11 98632-3421,Gustavo,,,,,,,,,
TPARTS - MATRIZ,Normal,,,,,Ativo,,,Enviar no grupo o que temos a devolver e aguardar o ok,"Só aprova, sem Documento",,,11 94849-1265,,https://trpartsbrasil.mercadoshops.com.br/,,,,,,,,
VDM DISTRIBUIDOR - PENHA,Normal,,,,,Ativo,,,BUSCA NOTAS PELO PEDIDO,,,,,,,Solicitar via contato: 11 5190-8202,,,,,,Crédito Parcial
TREVILUB - MATRIZ,Normal,,,,,Ativo,Indefinido ,,Mandar e-mail ,,Whatsapp Só individual,11 94192-4734,, sac@trevilub.com.br,,,,,,,,
TRPARTS BRASIL - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,Prazo de 7 dias. enviar foto do item e aguardar ok,"Só aprova, sem Documento",Whatsapp Só individual,11 96626-3953,,,,,,,,,,Crédito após analise 
UNIFRANCE RENAULT - NISSAN OSASCO,Aprovação Auto,,,,,,,,"Só enviar o item com NF, se estiver ok",,Whatsapp Só individual,11 95307-0768,,,,,,,,,,
UNIFRANCE RENAULT NISSAN OSASCO - MATRIZ,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Só enviar o item com NF, se estiver ok",,Whatsapp Só individual,11 95307-0768,,,,,,,,,,
UNIFRANCE RENAULT - ANAPOLIS GO,Normal,,,,,Ativo,Indefinido ,Indefinido ,"Só enviar o item com NF, se estiver ok",,Whatsapp Só individual,11 95307-0768,,,,,,,,,,
UNIVERSAL AUTOMOTIVE - MATRIZ,Normal,,,,,Ativo,Indefinido ,7,"Entrar na plataforma, ir em Ordens de serviço, gerar nob=va ordem, ou consultar em andamento, na ordem colar os dados da peça a ser devolvida, após vão solicitar a NFD, enviar no e-mail nfdevolucao@universalautomotive.com.br e aguardar retorno",,Plataforma,,,,11 98325-3000,,Universal, appestoque@mecanizou.com,123456,,,Crédito após analise 
VESPOR AUTOMOTIVE - FILIAL SP,Normal,,,,,Ativo,Indefinido ,30,"Enviar por e-mail os ittens a devolver, o print do app, buscar notas pela peça",,Email,,,"cav@vespor.com.br , cavrib1@vespor.com.br ",44 9982-3902,,,,,,,
VESPOR AUTOMOTIVE - MATRIZ,Normal,,,,,Ativo,Indefinido ,30,"Enviar por e-mail os ittens a devolver, o print do app, buscar notas pela peça",,Email,,,"cav@vespor.com.br , cavrib1@vespor.com.br ",44 9982-3902,,,,,,,
VETTER DISTRIBUIDORA - MATRIZ,Aprovação Auto,VETTER COM. DE PECAS AUTOM. LTDA,08.884.031/0001-64,"RUA FERNANDES MOREIRA, 501 CHAC STO ANTONI - 04716001 SAO PAULO - SP",,Ativo,Indefinido ,7,,,Whatsapp Grupo,,,,,"Via e-mail - demas@vetterpecas.com.br,  Solicitando envio e o CFOP 5949",,,,,,Crédito Parcial
VIGORITO,Normal,,,,,Ativo,,,,,Whatsapp Grupo,11 97981-0651,,,,,,,,,,
VJM - Cursino,Normal,,,,,Ativo,,7,,,Whatsapp Grupo,11 99429-9444,João,pecasatacado6@ventuno.com.br,,,,,,,,
VOGMAR - MATRIZ,Normal,,,,,Ativo,,7,"Enviar no grupo o print do app, aguardar o ok e enviar.","Só aprova, sem Documento",Whatsapp Grupo,1194018-2261,Central,,,"Enviar no grupo o print do app, aguardar o ok e enviar.",,,,,,Crédito Parcial
VOLKSWAGEN MARTE,Normal,,,,,,,,,,,,,,,,,,,,,
VW SORANA - VW CASA VERDE,Aprovação Auto,,,,,Ativo,indefinido,indefinido,"Enviar no Grupo o printo dos itens do app, com motivos e aguardar, so peças em 100 cpondições de envio",,Whatsapp Grupo,11 94528-3794,,,,,Neg. Automática: Sky Santo Amaro,,,,,
WURTH,Normal,,,,,Ativo,Indefinido ,30,"Enviar no grupo print dos itens, informar motivo da devolução e aguardar aprovação",,Whatsapp Grupo,11 97171-6657,Rafael Prado,,11 97171-6657,,,,,,,
Yokota Auto Peças - Yokota Mooca,Normal,,,,,Ativo,,7,,,,,,vendasonline@yokotaautopecas.com.br,,,,,,,,
Yokota Auto Peças - Yokota São Mateus,Normal,,,"Avenida Mateo Bei, 1329  - Cidade São Mateus, São Paulo - SP",,Ativo,,7,,,Whatsapp Grupo, 11 94785-8250,Guilherme Zanon,vendasonline@yokotaautopecas.com.br,,,,,,,,
ZAFRA AUTO PEÇAS - MATRIZ,Aprovação Auto,,,,,Ativo,Indefinido ,15,"So enviar os itens, se estiverem em condição de envio, BUSCA DE NOTAS POR REFERENCIA OU VALOR, OU CODIGO DA PEÇA",,Whatsapp Só individual,11 95421-8956,Arthur,,"Só enviar, mas atenção a itens antigos ou caros, nesses casos sempre enviar no grupo para analise.",,,,,,,Crédito após analise 
GRUPO SINAL - Ford Mix SBC,Normal,,,,,Ativo,,7,Mandar No grupo o print do app e apos ok seguir com as devoluções,"Só aprova, sem Documento",Whatsapp Grupo,11 97619-4173,Gustavo,,,,,,,,,
ORIGINAL VEICULOS - PEUGEOT Green Nações,Normal,,,,,Ativo,,7,,,,,,,,,,,,,,
VJM - Santo Amaro,Normal,,,,,Ativo,,,,,,11 99429-9444,João,pecasatacado6@ventuno.com.br,,,,,,,,
AUTO BITTS - BELO HORIZONTE,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
JAHU - CONTAGEM MG,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
IVEPARTS,Normal,,,,,Ativo,,,,,,,,,,,,,,,,
MERCADO LIVRE,Normal,,,,,Ativo,,,,,,,,,,,,,,,,`;

export const FornecedoresView: React.FC<FornecedoresViewProps> = ({ theme = 'dark', itemsFornecedores }) => {
  const isLight = theme === 'light';

  // State
  const [fornecedores, setFornecedores] = useState<FornecedorConfig[]>(() => {
    try {
      const saved = localStorage.getItem('fornecedores_custom_db_v5');
      if (saved) {
        return JSON.parse(saved) as FornecedorConfig[];
      }
    } catch (e) {
      console.error(e);
    }

    // Parse default CSV data
    const lines = DEFAULT_FORNECEDORES_CSV_DATA.split('\n');
    const parsed: FornecedorConfig[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV split handling quotes
      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());

      const nome = (cols[0] || '').replace(/^"|"$/g, '');
      if (!nome) continue;

      const carteira = (cols[1] || 'Normal').replace(/^"|"$/g, '');
      const razaoSocial = (cols[2] || '').replace(/^"|"$/g, '');
      const cnpj = (cols[3] || '').replace(/^"|"$/g, '');
      const endereco = (cols[4] || '').replace(/^"|"$/g, '');
      const statusRaw = (cols[6] || 'Ativo').replace(/^"|"$/g, '');
      const status: 'Ativo' | 'Inativo' | 'Travado' = 
        statusRaw.toLowerCase().includes('inativo') ? 'Inativo' : 
        statusRaw.toLowerCase().includes('travado') ? 'Travado' : 'Ativo';
      
      const prazo = (cols[8] || 'Indefinido').replace(/^"|"$/g, '');
      const tipoNeg = (cols[9] || '').replace(/^"|"$/g, '');
      const metodo = (cols[11] || '').replace(/^"|"$/g, '');
      const fone = (cols[12] || '').replace(/^"|"$/g, '');
      const contatoNome = (cols[13] || '').replace(/^"|"$/g, '');
      const contatoEmail = (cols[14] || '').replace(/^"|"$/g, '');
      const obs = (cols[15] || '').replace(/^"|"$/g, '');
      const link = (cols[17] || '').replace(/^"|"$/g, '');
      const login = (cols[18] || '').replace(/^"|"$/g, '');
      const senha = (cols[19] || '').replace(/^"|"$/g, '');

      let forcedStatus = status;
      let isAuto = carteira.toLowerCase().includes('aprovação') || carteira.toLowerCase().includes('coleta auto');
      
      const upperNome = nome.toUpperCase();
      if (upperNome.includes('COMPEL') || upperNome.includes('DINPAR')) {
        isAuto = false;
      }

      parsed.push({
        id: `forn_${i}_${Math.random().toString(36).substr(2, 5)}`,
        nome,
        carteira,
        razaoSocial,
        cnpj,
        endereco,
        status: forcedStatus,
        prazoDias: prazo,
        tipoNegociacao: tipoNeg,
        metodo,
        contatoFone: fone,
        contatoNome,
        contatoEmail,
        observacoes: obs,
        plataformaLink: link,
        plataformaLogin: login,
        plataformaSenha: senha,
        isAutomatico: isAuto
      });
    }

    // Merge any missing items from itemsFornecedores
    itemsFornecedores.forEach(fName => {
      if (!fName || !fName.trim()) return;
      const clean = fName.trim();
      const exists = parsed.some(p => p.nome.toUpperCase() === clean.toUpperCase());
      if (!exists) {
        parsed.push({
          id: `forn_dyn_${Math.random().toString(36).substr(2, 5)}`,
          nome: clean,
          carteira: 'Normal',
          status: 'Ativo',
          prazoDias: 'Indefinido',
          tipoNegociacao: 'Padrão',
          metodo: 'Whatsapp',
          isAutomatico: false
        });
      }
    });

    return parsed;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ativo' | 'travado' | 'automatico' | 'normal'>('all');
  const [editingForn, setEditingForn] = useState<FornecedorConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('fornecedores_custom_db_v5', JSON.stringify(fornecedores));
    } catch (e) {
      console.error(e);
    }
  }, [fornecedores]);

  // Lock / Unlock / Toggle automatico
  const handleToggleAuto = (id: string) => {
    setFornecedores(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, isAutomatico: !f.isAutomatico };
      }
      return f;
    }));
    setSuccessMsg('Tipo de fornecedor atualizado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleStatus = (id: string, newStatus: 'Ativo' | 'Inativo' | 'Travado') => {
    setFornecedores(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, status: newStatus };
      }
      return f;
    }));
    setSuccessMsg(`Status alterado para ${newStatus}!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForn) return;

    if (editingForn.id) {
      setFornecedores(prev => prev.map(f => f.id === editingForn.id ? editingForn : f));
    } else {
      const newObj = { ...editingForn, id: `forn_new_${Date.now()}` };
      setFornecedores(prev => [newObj, ...prev]);
    }

    setIsModalOpen(false);
    setEditingForn(null);
    setSuccessMsg('Fornecedor salvo com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fornecedor?')) {
      setFornecedores(prev => prev.filter(f => f.id !== id));
      setSuccessMsg('Fornecedor removido.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter(f => {
      const matchesSearch = 
        f.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.cnpj && f.cnpj.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.razaoSocial && f.razaoSocial.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.observacoes && f.observacoes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'ativo') return f.status === 'Ativo';
      if (filterType === 'travado') return f.status === 'Travado' || f.carteira.toLowerCase().includes('travado');
      if (filterType === 'automatico') return f.isAutomatico;
      if (filterType === 'normal') return !f.isAutomatico;
      return true;
    });
  }, [fornecedores, searchQuery, filterType]);

  const bgCard = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-600/20 text-indigo-500 rounded-xl border border-indigo-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl font-extrabold tracking-tight ${textPrimary}`}>
                Gestão de Fornecedores & Prazos
              </h1>
              <p className={`text-xs ${textMuted}`}>
                Controle completo de regras de devolução, prazos, contatos e negociações automáticas ou normais.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              setEditingForn({
                id: '',
                nome: '',
                carteira: 'Normal',
                status: 'Ativo',
                prazoDias: '15',
                tipoNegociacao: '',
                metodo: 'Whatsapp Grupo',
                isAutomatico: false
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/30 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className={`p-4 rounded-2xl border ${bgCard} shadow-sm space-y-3`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, CNPJ, razão social ou observação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'ativo', label: 'Ativos' },
              { id: 'travado', label: 'Travados / Bloqueados' },
              { id: 'automatico', label: 'Automáticos' },
              { id: 'normal', label: 'Normais' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/30'
                    : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fornecedores Table / Grid */}
      <div className={`rounded-2xl border ${bgCard} overflow-hidden shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] uppercase tracking-wider font-bold ${
                isLight ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-slate-950/60 text-slate-400 border-slate-800'
              }`}>
                <th className="p-3.5">Fornecedor / Razão Social</th>
                <th className="p-3.5">Status & Regra</th>
                <th className="p-3.5">Prazo / Limite</th>
                <th className="p-3.5">Contato & Método</th>
                <th className="p-3.5">Negociação / Observações</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum fornecedor encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredFornecedores.map(forn => {
                  const isTravado = forn.status === 'Travado' || forn.carteira.toLowerCase().includes('travado');
                  return (
                    <tr key={forn.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50/80' : 'hover:bg-slate-800/50'}`}>
                      {/* Nome & Razão Social */}
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-indigo-500 flex items-center space-x-1.5">
                          <span>{forn.nome}</span>
                        </div>
                        {forn.razaoSocial && (
                          <div className={`text-[11px] ${textMuted} truncate max-w-xs mt-0.5`}>
                            {forn.razaoSocial} {forn.cnpj ? `• CNPJ: ${forn.cnpj}` : ''}
                          </div>
                        )}
                        {forn.endereco && (
                          <div className={`text-[10px] ${textMuted} truncate max-w-xs`}>
                            📍 {forn.endereco}
                          </div>
                        )}
                      </td>

                      {/* Status & Regra (Automático / Normal / Travado) */}
                      <td className="p-3.5 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                            forn.status === 'Ativo' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : forn.status === 'Travado'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}>
                            {forn.status}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleAuto(forn.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                              forn.isAutomatico
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                                : 'bg-slate-500/10 text-slate-400 border-slate-700'
                            }`}
                            title="Alternar entre Automático e Normal"
                          >
                            {forn.isAutomatico ? '🤖 Automático' : '👤 Normal'}
                          </button>
                        </div>

                        <div className={`text-[11px] font-mono ${textMuted}`}>
                          Carteira: {forn.carteira || 'Normal'}
                        </div>
                      </td>

                      {/* Prazo / Limite */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-xs flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{forn.prazoDias} dias</span>
                        </div>
                        {forn.creditoGarantia && (
                          <div className={`text-[10px] mt-1 ${textMuted}`}>
                            Crédito: {forn.creditoGarantia}
                          </div>
                        )}
                      </td>

                      {/* Contato & Método */}
                      <td className="p-3.5">
                        <div className="font-semibold text-xs flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{forn.contatoFone || 'Não inf.'}</span>
                        </div>
                        {forn.contatoNome && (
                          <div className={`text-[11px] ${textMuted}`}>
                            Contato: {forn.contatoNome}
                          </div>
                        )}
                        <div className={`text-[10px] font-mono mt-0.5 ${textMuted}`}>
                          Método: {forn.metodo || 'Whatsapp'}
                        </div>
                      </td>

                      {/* Negociação / Observações */}
                      <td className="p-3.5 max-w-xs">
                        <div className={`text-[11px] line-clamp-2 ${textMuted}`} title={forn.observacoes || forn.tipoNegociacao}>
                          {forn.tipoNegociacao || forn.observacoes || 'Sem observações específicas'}
                        </div>
                        {forn.plataformaLink && (
                          <a
                            href={forn.plataformaLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-1 mt-1 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">Acessar Plataforma</span>
                          </a>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newStatus = forn.status === 'Ativo' ? 'Travado' : 'Ativo';
                            handleToggleStatus(forn.id, newStatus);
                          }}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                            isTravado 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={isTravado ? "Destravar fornecedor" : "Travar / Bloquear fornecedor"}
                        >
                          {isTravado ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingForn(forn);
                            setIsModalOpen(true);
                          }}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          }`}
                          title="Editar fornecedor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(forn.id)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          title="Excluir fornecedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Fornecedor */}
      {isModalOpen && editingForn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl border ${bgCard} shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className={`text-sm font-bold ${textPrimary}`}>
                  {editingForn.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg border ${
                  isLight ? 'hover:bg-slate-200 text-slate-600 border-slate-300' : 'hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFornecedor} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Nome do Fornecedor *</label>
                  <input
                    type="text"
                    required
                    value={editingForn.nome}
                    onChange={e => setEditingForn({ ...editingForn, nome: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="Ex: ACCIOLY - MATRIZ"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Razão Social</label>
                  <input
                    type="text"
                    value={editingForn.razaoSocial || ''}
                    onChange={e => setEditingForn({ ...editingForn, razaoSocial: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>CNPJ</label>
                  <input
                    type="text"
                    value={editingForn.cnpj || ''}
                    onChange={e => setEditingForn({ ...editingForn, cnpj: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="00.000.000/0001-00"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Prazo (dias)</label>
                  <input
                    type="text"
                    value={editingForn.prazoDias}
                    onChange={e => setEditingForn({ ...editingForn, prazoDias: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="Ex: 30"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Status</label>
                  <select
                    value={editingForn.status}
                    onChange={e => setEditingForn({ ...editingForn, status: e.target.value as any })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Travado">Travado / Bloqueado</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingForn.isAutomatico}
                      onChange={e => setEditingForn({ ...editingForn, isAutomatico: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className={`text-xs font-bold ${textPrimary}`}>
                    {editingForn.isAutomatico ? '🤖 Negociação / Aprovação Automática' : '👤 Negociação Normal'}
                  </span>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Contato (Telefone)</label>
                  <input
                    type="text"
                    value={editingForn.contatoFone || ''}
                    onChange={e => setEditingForn({ ...editingForn, contatoFone: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Método de Envio / Contato</label>
                  <input
                    type="text"
                    value={editingForn.metodo || ''}
                    onChange={e => setEditingForn({ ...editingForn, metodo: e.target.value })}
                    className={`w-full text-xs px-3 py-2 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="Ex: Whatsapp Grupo / Email"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Tipo de Negociação / Como Negociar</label>
                  <textarea
                    rows={3}
                    value={editingForn.tipoNegociacao || ''}
                    onChange={e => setEditingForn({ ...editingForn, tipoNegociacao: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                    placeholder="Instruções e regras de envio..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-xs font-bold mb-1 ${textPrimary}`}>Observações Importantes</label>
                  <textarea
                    rows={2}
                    value={editingForn.observacoes || ''}
                    onChange={e => setEditingForn({ ...editingForn, observacoes: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/30 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Fornecedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
