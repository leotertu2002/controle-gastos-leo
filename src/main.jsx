import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { Plus, LogOut, Trash2, Download, WalletCards, TrendingUp, CheckCircle2, XCircle, Edit3, LayoutDashboard, ClipboardList, BarChart3, Calculator, Copy } from 'lucide-react'
import './styles.css'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

const CATEGORIAS = ['Alimentação','Lazer','Transporte','Saúde','Utilidades','Festa/Bebida','Automóvel','Outros']
const CONTAS = ['Nubank','Inter','XP']
const FORMAS = ['Débito/PIX','Crédito']
const NATUREZAS = ['Gastos Fixos','Gastos Variáveis']
const TIPOS = ['Despesa','Receita Prevista','Receita Recebida','Investimento','Pagamento Fatura']
const PARCELAMENTOS = ['À vista','Parcelado','Recorrente/sem previsão']
const COMP_PLANOS = ['Único','Parcelado','Recorrente']
const COLORS = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185','#22d3ee','#f97316','#94a3b8','#4ade80']
const RECORRENCIA_CICLOS = 12

function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function pct(v,total){return total > 0 ? `${((Number(v||0)/total)*100).toFixed(1).replace('.',',')}%` : '0,0%'}
function isoToday(){return new Date().toISOString().slice(0,10)}
function toIso(d){return d.toISOString().slice(0,10)}
function formatBR(iso){return iso ? iso.split('-').reverse().join('/') : ''}
function cycleFromDate(date=new Date()){
  const y=date.getFullYear(), m=date.getMonth(), d=date.getDate()
  const start = d>=12 ? new Date(y,m,12) : new Date(y,m-1,12)
  const end = d>=12 ? new Date(y,m+1,11) : new Date(y,m,11)
  return {start,end}
}
function nextCycleFromStart(startIso, offset=1){
  const base = new Date(startIso + 'T00:00:00')
  const start = new Date(base.getFullYear(), base.getMonth()+offset, 12)
  const end = new Date(base.getFullYear(), base.getMonth()+offset+1, 11)
  return { start: toIso(start), end: toIso(end) }
}
function diffDaysInclusive(a,b){
  const x=new Date(a+'T00:00:00'), y=new Date(b+'T00:00:00')
  return Math.max(1, Math.floor((y-x)/86400000)+1)
}
function parseNumber(v){ return Number(String(v || 0).replace(',','.')) || 0 }

function AuthScreen(){
  const [mode,setMode]=useState('login')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')

  async function handleAuth(e){
    e.preventDefault()
    setLoading(true); setMessage('')
    const result = mode==='login'
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}})
    setLoading(false)
    if(result.error) setMessage(result.error.message)
    else if(mode==='signup') setMessage('Conta criada. Se pedir confirmação, verifique seu e-mail.')
  }

  return <div className="auth-page"><div className="auth-card">
    <div className="brand-icon"><WalletCards size={34}/></div>
    <h1>Leo Finance</h1>
    <p>Entre com e-mail e senha para acessar seu painel.</p>
    <div className="auth-tabs">
      <button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Entrar</button>
      <button className={mode==='signup'?'active':''} onClick={()=>setMode('signup')}>Criar conta</button>
    </div>
    <form onSubmit={handleAuth}>
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="e-mail" required/>
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="senha" minLength="6" required/>
      <button disabled={loading}>{loading?'Carregando...':mode==='login'?'Entrar':'Criar conta'}</button>
    </form>
    {message && <div className="message">{message}</div>}
  </div></div>
}

function App(){
  const c0=cycleFromDate()
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [tab,setTab]=useState('dashboard')
  const [transacoes,setTransacoes]=useState([])
  const [compromissos,setCompromissos]=useState([])
  const [inicioCiclo,setInicioCiclo]=useState(toIso(c0.start))
  const [fimCiclo,setFimCiclo]=useState(toIso(c0.end))
  const [metaAporte,setMetaAporte]=useState(Number(localStorage.getItem('metaAporteLeo')||600))
  const [editingCompromisso,setEditingCompromisso]=useState(null)
  const [editingTransacao,setEditingTransacao]=useState(null)

  const emptyForm = {data:isoToday(),tipo:'Despesa',categoria:'Alimentação',conta:'Inter',forma:'Débito/PIX',natureza:'Gastos Variáveis',descricao:'',valor:'',parcelamento:'À vista',quantidade_parcelas:2}
  const emptyCompForm = {descricao:'',categoria:'Outros',conta:'Inter',forma:'Débito/PIX',natureza:'Gastos Fixos',valor_previsto:'',plano:'Único',quantidade_parcelas:2}
  const [form,setForm]=useState(emptyForm)
  const [compForm,setCompForm]=useState(emptyCompForm)
  const [planejamento,setPlanejamento]=useState({
    salario: localStorage.getItem('planejamento_salario') || '',
    bonus: localStorage.getItem('planejamento_bonus') || '',
    extras: localStorage.getItem('planejamento_extras') || '',
    fatura: localStorage.getItem('planejamento_fatura') || '',
    aporteMinimo: localStorage.getItem('planejamento_aporteMinimo') || localStorage.getItem('metaAporteLeo') || '600',
    caixaDesejado: localStorage.getItem('planejamento_caixaDesejado') || ''
  })

  const emptyFiltros = {dataInicio:'', dataFim:'', tipo:'Todos', conta:'Todas', forma:'Todas', natureza:'Todas', categoria:'Todas', busca:'', ordenacao:'recentes'}
  const [filtros,setFiltros]=useState(emptyFiltros)

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>listener.subscription.unsubscribe()
  },[])
  useEffect(()=>{if(session) carregar()},[session,inicioCiclo,fimCiclo])
  useEffect(()=>localStorage.setItem('metaAporteLeo',String(metaAporte)),[metaAporte])
  useEffect(()=>{
    Object.entries(planejamento).forEach(([key,value])=>localStorage.setItem(`planejamento_${key}`, String(value ?? '')))
  },[planejamento])

  async function carregar(){
    const [{data:t,error:et},{data:c,error:ec}] = await Promise.all([
      supabase.from('transacoes').select('*').gte('data',inicioCiclo).lte('data',fimCiclo).order('data',{ascending:false}),
      supabase.from('compromissos').select('*').eq('ciclo_inicio',inicioCiclo).eq('ciclo_fim',fimCiclo).order('created_at',{ascending:false})
    ])
    if(et) alert(et.message); if(ec) alert(ec.message)
    setTransacoes(t||[]); setCompromissos(c||[])
  }

  async function inserirCompromissos(rows){
    if(rows.length === 0) return
    const { error } = await supabase.from('compromissos').insert(rows)
    if(error) throw error
  }

  function montarCompromissosFuturos({descricao, categoria, conta, forma, natureza, valorParcela, quantidade, inicioOffset=1, recorrente=false}){
    const rows = []
    for(let i=inicioOffset; i<quantidade; i++){
      const ciclo = nextCycleFromStart(inicioCiclo, i)
      rows.push({
        user_id: session.user.id,
        ciclo_inicio: ciclo.start,
        ciclo_fim: ciclo.end,
        descricao: recorrente ? `${descricao} (recorrente)` : `${descricao} (${i+1}/${quantidade})`,
        categoria,
        conta,
        forma,
        natureza,
        valor_previsto: valorParcela,
        status: 'Previsto'
      })
    }
    return rows
  }

  async function adicionar(e){
    e.preventDefault()
    const valorInformado=parseNumber(form.valor)
    if(!valorInformado||valorInformado<=0) return alert('Informe um valor válido.')

    const ehDespesa = form.tipo === 'Despesa'
    const ehParcelado = ehDespesa && form.parcelamento === 'Parcelado' && !editingTransacao
    const ehRecorrente = ehDespesa && form.parcelamento === 'Recorrente/sem previsão' && !editingTransacao
    const qtd = ehParcelado ? Math.max(2, Number(form.quantidade_parcelas || 2)) : 1
    const valorLancamento = ehParcelado ? Number((valorInformado / qtd).toFixed(2)) : valorInformado
    const descricaoLancamento = ehParcelado ? `${form.descricao} (1/${qtd})` : form.descricao
    const { parcelamento, quantidade_parcelas, ...formSemParcelamento } = form
    const payload = {...formSemParcelamento, descricao: descricaoLancamento, valor: valorLancamento, user_id:session.user.id}

    try {
      const result = editingTransacao
        ? await supabase.from('transacoes').update(payload).eq('id', editingTransacao.id)
        : await supabase.from('transacoes').insert(payload)
      if(result.error) throw result.error

      if(ehParcelado){
        await inserirCompromissos(montarCompromissosFuturos({
          descricao: form.descricao,
          categoria: form.categoria,
          conta: form.conta,
          forma: form.forma,
          natureza: form.natureza,
          valorParcela: valorLancamento,
          quantidade: qtd,
          inicioOffset: 1
        }))
      }

      if(ehRecorrente){
        await inserirCompromissos(montarCompromissosFuturos({
          descricao: form.descricao,
          categoria: form.categoria,
          conta: form.conta,
          forma: form.forma,
          natureza: form.natureza,
          valorParcela: valorInformado,
          quantidade: RECORRENCIA_CICLOS,
          inicioOffset: 1,
          recorrente: true
        }))
      }

      setForm({...emptyForm,data:isoToday()}); setEditingTransacao(null); carregar()
    } catch(error){
      alert(error.message)
    }
  }

  function editarTransacao(t){
    setEditingTransacao(t)
    setTab('lancamentos')
    setForm({data:t.data,tipo:t.tipo,categoria:t.categoria,conta:t.conta,forma:t.forma,natureza:t.natureza,descricao:t.descricao,valor:t.valor,parcelamento:'À vista',quantidade_parcelas:2})
    window.scrollTo({top:0, behavior:'smooth'})
  }

  function duplicarTransacao(t){
    setEditingTransacao(null)
    setTab('lancamentos')
    setForm({
      data: isoToday(),
      tipo: t.tipo,
      categoria: t.categoria,
      conta: t.conta,
      forma: t.forma,
      natureza: t.natureza,
      descricao: t.descricao,
      valor: t.valor,
      parcelamento:'À vista',
      quantidade_parcelas:2
    })
    window.scrollTo({top:0, behavior:'smooth'})
  }
  async function excluir(id){
    if(!confirm('Excluir este lançamento?')) return
    const {error}=await supabase.from('transacoes').delete().eq('id',id)
    if(error) alert(error.message); else carregar()
  }

  async function salvarCompromisso(e){
    e.preventDefault()
    const valor=parseNumber(compForm.valor_previsto)
    if(!valor||valor<=0) return alert('Informe um valor previsto válido.')

    const qtd = compForm.plano === 'Parcelado' ? Math.max(2, Number(compForm.quantidade_parcelas || 2)) : 1

    if(!editingCompromisso && (compForm.plano === 'Parcelado' || compForm.plano === 'Recorrente')){
      try {
        const total = compForm.plano === 'Recorrente' ? RECORRENCIA_CICLOS : qtd
        const rows = []
        for(let i=0; i<total; i++){
          const ciclo = nextCycleFromStart(inicioCiclo, i)
          rows.push({
            user_id: session.user.id,
            ciclo_inicio: ciclo.start,
            ciclo_fim: ciclo.end,
            descricao: compForm.plano === 'Recorrente' ? `${compForm.descricao} (recorrente)` : `${compForm.descricao} (${i+1}/${qtd})`,
            categoria: compForm.categoria,
            conta: compForm.conta,
            forma: compForm.forma,
            natureza: compForm.natureza,
            valor_previsto: valor,
            status: 'Previsto'
          })
        }
        await inserirCompromissos(rows)
        setCompForm(emptyCompForm); carregar(); return
      } catch(error){ alert(error.message); return }
    }

    const {plano, quantidade_parcelas, ...compSemPlano} = compForm
    const payload={...compSemPlano,valor_previsto:valor,ciclo_inicio:inicioCiclo,ciclo_fim:fimCiclo,user_id:session.user.id}
    const result = editingCompromisso
      ? await supabase.from('compromissos').update(payload).eq('id',editingCompromisso.id)
      : await supabase.from('compromissos').insert(payload)
    if(result.error) alert(result.error.message)
    else {setCompForm(emptyCompForm); setEditingCompromisso(null); carregar()}
  }
  function editarCompromisso(c){
    setEditingCompromisso(c)
    setTab('lancamentos')
    setCompForm({descricao:c.descricao,categoria:c.categoria,conta:c.conta,forma:c.forma,natureza:c.natureza,valor_previsto:c.valor_previsto,plano:'Único',quantidade_parcelas:2})
    window.scrollTo({top:0, behavior:'smooth'})
  }
  async function confirmarCompromisso(c){
    const raw=prompt('Valor confirmado:',Number(c.valor_previsto).toFixed(2).replace('.',','))
    if(raw===null) return
    const valor=parseNumber(raw)
    if(!valor||valor<=0) return
    const transacao={user_id:session.user.id,data:isoToday(),tipo:'Despesa',categoria:c.categoria,conta:c.conta,forma:c.forma,natureza:c.natureza,descricao:c.descricao,valor}
    const {data,error}=await supabase.from('transacoes').insert(transacao).select('id').single()
    if(error) return alert(error.message)
    const {error:updateError}=await supabase.from('compromissos').update({status:'Confirmado',data_confirmacao:isoToday(),transacao_id:data.id}).eq('id',c.id)
    if(updateError) alert(updateError.message); else carregar()
  }
  async function cancelarCompromisso(c){
    const {error}=await supabase.from('compromissos').update({status:'Cancelado'}).eq('id',c.id)
    if(error) alert(error.message); else carregar()
  }
  async function excluirCompromisso(id){
    if(!confirm('Excluir este compromisso?')) return
    const {error}=await supabase.from('compromissos').delete().eq('id',id)
    if(error) alert(error.message); else carregar()
  }

  function aplicarCicloAtual(){const c=cycleFromDate();setInicioCiclo(toIso(c.start));setFimCiclo(toIso(c.end))}
  function proximoCiclo(){const s=new Date(inicioCiclo+'T00:00:00');setInicioCiclo(toIso(new Date(s.getFullYear(),s.getMonth()+1,12)));setFimCiclo(toIso(new Date(s.getFullYear(),s.getMonth()+2,11)))}
  function cicloAnterior(){const s=new Date(inicioCiclo+'T00:00:00');setInicioCiclo(toIso(new Date(s.getFullYear(),s.getMonth()-1,12)));setFimCiclo(toIso(new Date(s.getFullYear(),s.getMonth(),11)))}

  const saldoPorConta=useMemo(()=>{
    return CONTAS.map(conta=>{
      const receitas = transacoes.filter(t=>t.conta===conta && t.tipo==='Receita Recebida').reduce((s,t)=>s+Number(t.valor),0)
      const saidas = transacoes
        .filter(t=>t.conta===conta && t.forma==='Débito/PIX' && ['Despesa','Investimento','Pagamento Fatura'].includes(t.tipo))
        .reduce((s,t)=>s+Number(t.valor),0)
      return {conta, valor: receitas-saidas}
    })
  },[transacoes])

  const dash=useMemo(()=>{
    const soma=(arr)=>arr.reduce((s,t)=>s+Number(t.valor||t.valor_previsto||0),0)
    const receitaPrevista=soma(transacoes.filter(t=>t.tipo==='Receita Prevista'))
    const receitaRecebida=soma(transacoes.filter(t=>t.tipo==='Receita Recebida'))
    const despesas=soma(transacoes.filter(t=>t.tipo==='Despesa'))
    const investimentos=soma(transacoes.filter(t=>t.tipo==='Investimento'))
    const pagamentosFatura=soma(transacoes.filter(t=>t.tipo==='Pagamento Fatura'))
    const gastosVariaveis=soma(transacoes.filter(t=>t.tipo==='Despesa'&&t.natureza==='Gastos Variáveis'))
    const credito=soma(transacoes.filter(t=>t.forma==='Crédito'&&['Despesa','Investimento'].includes(t.tipo)))
    const caixaDisponivel=saldoPorConta.reduce((s,v)=>s+Number(v.valor),0)
    const compromissosPrevistos=compromissos.filter(c=>c.status==='Previsto').reduce((s,c)=>s+Number(c.valor_previsto),0)
    const reservaAporte=Math.max(0,metaAporte-investimentos)
    const receitaTotal=receitaPrevista+receitaRecebida
    const hoje=isoToday()
    const ref=hoje<inicioCiclo?inicioCiclo:hoje>fimCiclo?fimCiclo:hoje
    const diasPassados=diffDaysInclusive(inicioCiclo,ref)
    const diasTotal=diffDaysInclusive(inicioCiclo,fimCiclo)
    const diasRestantes=Math.max(0,diasTotal-diasPassados)
    const mediaVariavelDia=gastosVariaveis/Math.max(1,diasPassados)
    const mediaPermitidaDia=diasRestantes>0 ? Math.max(0, caixaDisponivel)/diasRestantes : Math.max(0, caixaDisponivel)
    const projecaoVariavelRestante=mediaVariavelDia*diasRestantes
    const saldoProjetado=caixaDisponivel-projecaoVariavelRestante
    const ritmoEsperado = diasTotal > 0 ? (caixaDisponivel + gastosVariaveis) * (diasPassados/diasTotal) : gastosVariaveis
    const diferencaRitmo = ritmoEsperado - gastosVariaveis
    const situacao = caixaDisponivel <= 0 ? 'Crítico' : diferencaRitmo >= 0 ? 'Dentro do planejado' : 'Atenção'
    const situacaoDescricao = situacao === 'Crítico'
      ? 'Seu caixa operacional está zerado ou negativo. Evite novos gastos no débito/PIX e avalie se será necessário resgatar ou reduzir despesas.'
      : situacao === 'Atenção'
        ? 'Seu ritmo de gastos está acima do esperado para o caixa disponível. Reduzir gastos variáveis ajuda a preservar o planejamento.'
        : 'Seu ritmo atual está compatível com o caixa disponível para o ciclo.'
    const saldoProjetadoDescricao = saldoProjetado < 0
      ? `Mantendo a média atual de gastos variáveis, podem faltar aproximadamente ${money(Math.abs(saldoProjetado))} até o fim do ciclo.`
      : `Mantendo a média atual de gastos variáveis, você pode encerrar o ciclo com cerca de ${money(saldoProjetado)} em caixa.`
    const recomendacoes = []
    if(receitaPrevista === 0) recomendacoes.push('A projeção pode ficar distorcida até você lançar a receita prevista do próximo ciclo.')
    if(saldoProjetado < 0) recomendacoes.push(`Reduza gastos variáveis ou considere um resgate de aproximadamente ${money(Math.abs(saldoProjetado))} se quiser manter o ritmo atual.`)
    if(mediaVariavelDia > mediaPermitidaDia && mediaPermitidaDia > 0) recomendacoes.push(`Sua média variável atual está acima da meta diária. Tente ficar próximo de ${money(mediaPermitidaDia)}/dia.`)
    if(saldoProjetado >= 0 && caixaDisponivel > 0) recomendacoes.push('Você está com caixa positivo. Continue acompanhando o ritmo para preservar o planejamento.')
    return {mediaPermitidaDia,receitaPrevista,receitaRecebida,receitaTotal,despesas,investimentos,pagamentosFatura,gastosVariaveis,credito,caixaDisponivel,compromissosPrevistos,reservaAporte,diasRestantes,mediaVariavelDia,projecaoVariavelRestante,saldoProjetado,situacao,situacaoDescricao,saldoProjetadoDescricao,recomendacoes}
  },[transacoes,compromissos,metaAporte,inicioCiclo,fimCiclo,saldoPorConta])

  const gastosReais = transacoes.filter(t=>['Despesa','Investimento'].includes(t.tipo))
  const porCategoriaBase=useMemo(()=>{
    const map={}
    gastosReais.forEach(t=>map[t.categoria]=(map[t.categoria]||0)+Number(t.valor))
    return Object.entries(map).map(([categoria,valor])=>({categoria,valor}))
  },[transacoes])
  const porCategoria=useMemo(()=>{
    const arr=[...porCategoriaBase].sort((a,b)=>b.valor-a.valor)
    const restante = Math.max(0, dash.receitaTotal - arr.reduce((s,x)=>s+x.valor,0) - dash.compromissosPrevistos - dash.reservaAporte)
    if(restante > 0) arr.push({categoria:'Disponível / não gasto', valor:restante})
    return arr
  },[porCategoriaBase,dash.receitaTotal,dash.compromissosPrevistos,dash.reservaAporte])
  const porConta=useMemo(()=>{
    return CONTAS.map(conta=>({conta, valor:gastosReais.filter(t=>t.conta===conta).reduce((s,t)=>s+Number(t.valor),0)}))
  },[transacoes])
  const fixosVariaveis=useMemo(()=>{
    const fixos = transacoes.filter(t=>['Despesa','Investimento'].includes(t.tipo) && t.natureza==='Gastos Fixos').reduce((s,t)=>s+Number(t.valor),0)
    const variaveis = transacoes.filter(t=>['Despesa','Investimento'].includes(t.tipo) && t.natureza==='Gastos Variáveis').reduce((s,t)=>s+Number(t.valor),0)
    return [{natureza:'Gastos Fixos', valor:fixos},{natureza:'Gastos Variáveis', valor:variaveis}]
  },[transacoes])
  const porDiaVariavel=useMemo(()=>{
    const map={}
    transacoes.filter(t=>t.tipo==='Despesa'&&t.natureza==='Gastos Variáveis').forEach(t=>{map[t.data]=(map[t.data]||0)+Number(t.valor)})
    return Object.entries(map).map(([data,valor])=>({data, dia:data.slice(8,10)+'/'+data.slice(5,7), valor})).sort((a,b)=>a.data.localeCompare(b.data))
  },[transacoes])
  const faturas=useMemo(()=>{
    return CONTAS.map(conta=>({conta, valor:transacoes.filter(t=>t.conta===conta&&t.forma==='Crédito'&&['Despesa','Investimento'].includes(t.tipo)).reduce((s,t)=>s+Number(t.valor),0)}))
  },[transacoes])

  const planejamentoCalc=useMemo(()=>{
    const receitas=parseNumber(planejamento.salario)+parseNumber(planejamento.bonus)+parseNumber(planejamento.extras)
    const fatura=parseNumber(planejamento.fatura)
    const aporte=parseNumber(planejamento.aporteMinimo)
    const caixaDesejado=parseNumber(planejamento.caixaDesejado)
    const proximo=nextCycleFromStart(inicioCiclo,1)
    const compromissosProximo=compromissos
      .filter(c=>c.status==='Previsto' && c.ciclo_inicio===proximo.start && c.ciclo_fim===proximo.end)
      .reduce((s,c)=>s+Number(c.valor_previsto),0)
    const sobraAntesCaixa=receitas-fatura-compromissosProximo-aporte
    const resgateNecessario=Math.max(0,caixaDesejado-sobraAntesCaixa)
    const aporteExtra=Math.max(0,sobraAntesCaixa-caixaDesejado)
    const metaDiaria=caixaDesejado/diffDaysInclusive(proximo.start,proximo.end)
    const compromissosCredito=compromissos
      .filter(c=>c.status==='Previsto' && c.forma==='Crédito')
      .reduce((s,c)=>s+Number(c.valor_previsto),0)
    let saude='Saudável'
    if(resgateNecessario>0) saude='Crítico'
    else if(aporteExtra>0) saude='Excelente'
    else if(sobraAntesCaixa>=caixaDesejado) saude='Saudável'
    else saude='Atenção'
    return {receitas,fatura,aporte,caixaDesejado,proximo,compromissosProximo,sobraAntesCaixa,resgateNecessario,aporteExtra,metaDiaria,compromissosCredito,saude}
  },[planejamento,compromissos,inicioCiclo])


  const transacoesFiltradas=useMemo(()=>{
    let arr=[...transacoes]
    if(filtros.dataInicio) arr=arr.filter(t=>t.data>=filtros.dataInicio)
    if(filtros.dataFim) arr=arr.filter(t=>t.data<=filtros.dataFim)
    if(filtros.tipo!=='Todos') arr=arr.filter(t=>t.tipo===filtros.tipo)
    if(filtros.conta!=='Todas') arr=arr.filter(t=>t.conta===filtros.conta)
    if(filtros.forma!=='Todas') arr=arr.filter(t=>t.forma===filtros.forma)
    if(filtros.natureza!=='Todas') arr=arr.filter(t=>t.natureza===filtros.natureza)
    if(filtros.categoria!=='Todas') arr=arr.filter(t=>t.categoria===filtros.categoria)
    if(filtros.busca.trim()){
      const q=filtros.busca.trim().toLowerCase()
      arr=arr.filter(t=>String(t.descricao||'').toLowerCase().includes(q))
    }
    arr.sort((a,b)=>{
      if(filtros.ordenacao==='antigos') return a.data.localeCompare(b.data)
      if(filtros.ordenacao==='maior') return Number(b.valor)-Number(a.valor)
      if(filtros.ordenacao==='menor') return Number(a.valor)-Number(b.valor)
      return b.data.localeCompare(a.data)
    })
    return arr
  },[transacoes,filtros])

  const resumoFiltros=useMemo(()=>{
    const somaTipo=(tipo)=>transacoesFiltradas.filter(t=>t.tipo===tipo).reduce((s,t)=>s+Number(t.valor),0)
    return {
      quantidade: transacoesFiltradas.length,
      receitas: somaTipo('Receita Recebida') + somaTipo('Receita Prevista'),
      despesas: somaTipo('Despesa'),
      investimentos: somaTipo('Investimento'),
      faturas: somaTipo('Pagamento Fatura')
    }
  },[transacoesFiltradas])

  const calendarioCiclo=useMemo(()=>{
    const cells=[]
    const inicio=new Date(inicioCiclo+'T00:00:00')
    const fim=new Date(fimCiclo+'T00:00:00')
    const primeiroDiaSemana=inicio.getDay() // 0 domingo, 1 segunda...
    const ordemVisual=[0,1,2,3,4,5,6] // Dom, Seg, Ter, Qua, Qui, Sex, Sáb

    for(let i=0;i<primeiroDiaSemana;i++){
      cells.push({blank:true, key:`blank-${i}`})
    }

    for(let d=new Date(inicio); d<=fim; d.setDate(d.getDate()+1)){
      const iso=toIso(new Date(d))
      const gastosDoDia=transacoes.filter(t=>t.data===iso && t.tipo==='Despesa' && t.natureza==='Gastos Variáveis')
      const total=gastosDoDia.reduce((s,t)=>s+Number(t.valor),0)
      const maior=gastosDoDia.reduce((m,t)=>Number(t.valor)>Number(m?.valor||0)?t:m,null)
      let nivel='cal-neutral'
      if(total>200) nivel='cal-red-strong'
      else if(total>100) nivel='cal-red-dark'
      else if(total>50) nivel='cal-red-light'
      cells.push({
        data:iso,
        key:iso,
        dia:String(new Date(d).getDate()).padStart(2,'0'),
        semana:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(d).getDay()],
        total,
        quantidade:gastosDoDia.length,
        maior,
        nivel
      })
    }
    return cells
  },[transacoes,inicioCiclo,fimCiclo])

  function limparFiltros(){ setFiltros(emptyFiltros) }

  function exportarCSV(){
    const linhas=[['Data','Tipo','Categoria','Conta','Forma','Natureza','Descrição','Valor']]
    transacoes.forEach(t=>linhas.push([t.data,t.tipo,t.categoria,t.conta,t.forma,t.natureza,t.descricao,t.valor]))
    const csv=linhas.map(l=>l.map(c=>`"${String(c).replaceAll('"','""')}"`).join(';')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download=`leo-finance-${inicioCiclo}-a-${fimCiclo}.csv`; a.click()
  }

  if(loading) return <div className="loading">Carregando...</div>
  if(!session) return <AuthScreen/>

  return <div className="app">
    <header className="topbar"><div><h1>Leo Finance</h1><p>Ciclo: {formatBR(inicioCiclo)} até {formatBR(fimCiclo)} • {session.user.email}</p></div><button className="ghost" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Sair</button></header>
    <main>
      <section className="toolbar">
        <button className="ghost" onClick={cicloAnterior}>← Ciclo anterior</button><button className="ghost" onClick={aplicarCicloAtual}>Ciclo atual</button><button className="ghost" onClick={proximoCiclo}>Próximo ciclo →</button>
        <label>Início</label><input type="date" value={inicioCiclo} onChange={e=>setInicioCiclo(e.target.value)}/>
        <label>Fim</label><input type="date" value={fimCiclo} onChange={e=>setFimCiclo(e.target.value)}/>
        <button className="ghost" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button>
      </section>

      <nav className="tabs">
        <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}><LayoutDashboard size={16}/> Dashboard</button>
        <button className={tab==='lancamentos'?'active':''} onClick={()=>setTab('lancamentos')}><ClipboardList size={16}/> Lançamentos</button>
        <button className={tab==='planejamento'?'active':''} onClick={()=>setTab('planejamento')}><Calculator size={16}/> Planejamento</button>
        <button className={tab==='analises'?'active':''} onClick={()=>setTab('analises')}><BarChart3 size={16}/> Análises</button>
      </nav>

      {tab==='dashboard' && <>
        <section className="cards">
          <div className="card hero-card"><span>Caixa disponível</span><strong className={dash.caixaDisponivel>=0?'green':'red'}>{money(dash.caixaDisponivel)}</strong><small>Meta diária: {money(dash.mediaPermitidaDia)}</small></div>
          <div className="card"><span>Receita recebida</span><strong className="green">{money(dash.receitaRecebida)}</strong></div>
          <div className="card"><span>Receita prevista</span><strong className="green">{money(dash.receitaPrevista)}</strong></div>
          <div className="card"><span>Crédito utilizado</span><strong>{money(dash.credito)}</strong></div>
        </section>
        <section className="cards">
          <div className="card"><span>Compromissos previstos</span><strong>{money(dash.compromissosPrevistos)}</strong></div>
          <div className="card"><span>Dias restantes</span><strong>{dash.diasRestantes}</strong></div>
          <div className="card"><span>Situação do ciclo</span><strong className={dash.situacao==='Crítico'?'red':dash.situacao==='Atenção'?'':'green'}>{dash.situacao}</strong><small>{dash.situacaoDescricao}</small></div>
          <div className="card"><span>Investido no ciclo</span><strong>{money(dash.investimentos)}</strong><small>Reserva aporte: {money(dash.reservaAporte)}</small></div>
        </section>
        <section className="projection"><div><h2><TrendingUp size={19}/> Projeção do ciclo</h2><p>Média variável real: <b>{money(dash.mediaVariavelDia)}/dia</b>. Meta diária atual: <b>{money(dash.mediaPermitidaDia)}/dia</b>. Faltam <b>{dash.diasRestantes}</b> dias.</p><p className="chart-note">{dash.saldoProjetadoDescricao}</p></div><div className={dash.saldoProjetado>=0?'projection-number green':'projection-number red'}><span>Saldo projetado</span><strong>{money(dash.saldoProjetado)}</strong></div></section>
        <section className="panel"><h2>Recomendações do ciclo</h2><div className="recommendations">{dash.recomendacoes.map((r,i)=><div key={i}>{r}</div>)}</div></section>
        <section className="layout">
          <div className="panel"><h2>Faturas por cartão</h2><div className="simple-list">{faturas.map((f,i)=><div key={f.conta}><span><b className="dot" style={{background:COLORS[i]}}></b>{f.conta}</span><b>{money(f.valor)}</b></div>)}</div></div>
          <div className="panel"><h2>Saldo por conta</h2><div className="simple-list">{saldoPorConta.map((s,i)=><div key={s.conta}><span><b className="dot" style={{background:COLORS[i+3]}}></b>{s.conta}</span><b className={s.valor>=0?'green':'red'}>{money(s.valor)}</b></div>)}</div><p className="chart-note">Considera apenas Receita Recebida e saídas em Débito/PIX.</p></div>
        </section>
      </>}

      {tab==='lancamentos' && <>
        <section className="layout">
          <form className="panel form" onSubmit={adicionar}><h2><Plus size={18}/> {editingTransacao?'Editar lançamento real':'Novo lançamento real'}</h2><div className="form-grid">
            <input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required/>
            <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>{TIPOS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>{CATEGORIAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={form.conta} onChange={e=>setForm({...form,conta:e.target.value})}>{CONTAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={form.forma} onChange={e=>setForm({...form,forma:e.target.value})}>{FORMAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={form.natureza} onChange={e=>setForm({...form,natureza:e.target.value})}>{NATUREZAS.map(x=><option key={x}>{x}</option>)}</select>
            {form.tipo==='Despesa' && <select value={form.parcelamento} onChange={e=>setForm({...form,parcelamento:e.target.value})} disabled={!!editingTransacao}>{PARCELAMENTOS.map(x=><option key={x}>{x}</option>)}</select>}
            {form.tipo==='Despesa' && form.parcelamento === 'Parcelado' && !editingTransacao && <input placeholder="Quantidade de parcelas" type="number" min="2" step="1" value={form.quantidade_parcelas} onChange={e=>setForm({...form,quantidade_parcelas:e.target.value})} required/>}
            <input placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} required/>
            <input placeholder={form.parcelamento === 'Parcelado' ? 'Valor total da compra' : 'Valor'} type="number" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/>
          </div><button>{editingTransacao?'Salvar edição':'Adicionar lançamento'}</button>{editingTransacao&&<button type="button" className="ghost full" onClick={()=>{setEditingTransacao(null);setForm({...emptyForm,data:isoToday()})}}>Cancelar edição</button>}</form>

          <form className="panel form" onSubmit={salvarCompromisso}><h2><Plus size={18}/> Compromisso previsto</h2><div className="form-grid">
            <input placeholder="Descrição" value={compForm.descricao} onChange={e=>setCompForm({...compForm,descricao:e.target.value})} required/>
            <input placeholder="Valor previsto" type="number" step="0.01" value={compForm.valor_previsto} onChange={e=>setCompForm({...compForm,valor_previsto:e.target.value})} required/>
            <select value={compForm.categoria} onChange={e=>setCompForm({...compForm,categoria:e.target.value})}>{CATEGORIAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={compForm.conta} onChange={e=>setCompForm({...compForm,conta:e.target.value})}>{CONTAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={compForm.forma} onChange={e=>setCompForm({...compForm,forma:e.target.value})}>{FORMAS.map(x=><option key={x}>{x}</option>)}</select>
            <select value={compForm.natureza} onChange={e=>setCompForm({...compForm,natureza:e.target.value})}>{NATUREZAS.map(x=><option key={x}>{x}</option>)}</select>
            {!editingCompromisso && <select value={compForm.plano} onChange={e=>setCompForm({...compForm,plano:e.target.value})}>{COMP_PLANOS.map(x=><option key={x}>{x}</option>)}</select>}
            {!editingCompromisso && compForm.plano === 'Parcelado' && <input placeholder="Quantidade de parcelas" type="number" min="2" step="1" value={compForm.quantidade_parcelas} onChange={e=>setCompForm({...compForm,quantidade_parcelas:e.target.value})} required/>}
          </div><button>{editingCompromisso?'Salvar edição':'Adicionar compromisso'}</button>{editingCompromisso&&<button type="button" className="ghost full" onClick={()=>{setEditingCompromisso(null);setCompForm(emptyCompForm)}}>Cancelar edição</button>}</form>
        </section>
        <section className="panel"><h2>Compromissos previstos</h2><div className="table-wrap"><table><thead><tr><th>Status</th><th>Descrição</th><th>Categoria</th><th>Conta</th><th>Forma</th><th>Natureza</th><th>Valor</th><th>Ações</th></tr></thead><tbody>
          {compromissos.map(c=><tr key={c.id} className={c.status!=='Previsto'?'muted-row':''}><td>{c.status}</td><td>{c.descricao}</td><td>{c.categoria}</td><td>{c.conta}</td><td>{c.forma}</td><td>{c.natureza}</td><td>{money(c.valor_previsto)}</td><td className="actions">{c.status==='Previsto'&&<button onClick={()=>confirmarCompromisso(c)}><CheckCircle2 size={15}/></button>}{c.status==='Previsto'&&<button onClick={()=>editarCompromisso(c)}><Edit3 size={15}/></button>}{c.status==='Previsto'&&<button onClick={()=>cancelarCompromisso(c)}><XCircle size={15}/></button>}<button className="danger" onClick={()=>excluirCompromisso(c.id)}><Trash2 size={14}/></button></td></tr>)}
          {compromissos.length===0&&<tr><td colSpan="8" className="empty">Nenhum compromisso previsto neste ciclo.</td></tr>}
        </tbody></table></div></section>
        <section className="panel"><h2>Filtros dos lançamentos</h2><div className="filter-grid">
          <input type="date" value={filtros.dataInicio} onChange={e=>setFiltros({...filtros,dataInicio:e.target.value})}/>
          <input type="date" value={filtros.dataFim} onChange={e=>setFiltros({...filtros,dataFim:e.target.value})}/>
          <select value={filtros.tipo} onChange={e=>setFiltros({...filtros,tipo:e.target.value})}><option>Todos</option>{TIPOS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={filtros.conta} onChange={e=>setFiltros({...filtros,conta:e.target.value})}><option>Todas</option>{CONTAS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={filtros.forma} onChange={e=>setFiltros({...filtros,forma:e.target.value})}><option>Todas</option>{FORMAS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={filtros.natureza} onChange={e=>setFiltros({...filtros,natureza:e.target.value})}><option>Todas</option>{NATUREZAS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={filtros.categoria} onChange={e=>setFiltros({...filtros,categoria:e.target.value})}><option>Todas</option>{CATEGORIAS.map(x=><option key={x}>{x}</option>)}</select>
          <select value={filtros.ordenacao} onChange={e=>setFiltros({...filtros,ordenacao:e.target.value})}><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="maior">Maior valor</option><option value="menor">Menor valor</option></select>
          <input placeholder="Buscar descrição" value={filtros.busca} onChange={e=>setFiltros({...filtros,busca:e.target.value})}/>
          <button className="ghost" type="button" onClick={limparFiltros}>Limpar filtros</button>
        </div><div className="summary-row"><span>{resumoFiltros.quantidade} lançamentos</span><span>Receitas: {money(resumoFiltros.receitas)}</span><span>Despesas: {money(resumoFiltros.despesas)}</span><span>Investimentos: {money(resumoFiltros.investimentos)}</span><span>Faturas: {money(resumoFiltros.faturas)}</span></div></section>
        <section className="panel"><h2>Lançamentos reais do ciclo</h2><div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Forma</th><th>Natureza</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead><tbody>
          {transacoesFiltradas.map(t=><tr key={t.id}><td>{formatBR(t.data)}</td><td>{t.tipo}</td><td>{t.categoria}</td><td>{t.conta}</td><td>{t.forma}</td><td>{t.natureza}</td><td>{t.descricao}</td><td>{money(t.valor)}</td><td className="actions"><button title="Editar" onClick={()=>editarTransacao(t)}><Edit3 size={14}/></button><button title="Duplicar" onClick={()=>duplicarTransacao(t)}><Copy size={14}/></button><button className="danger" title="Excluir" onClick={()=>excluir(t.id)}><Trash2 size={14}/></button></td></tr>)}
          {transacoesFiltradas.length===0&&<tr><td colSpan="9" className="empty">Nenhum lançamento encontrado com os filtros atuais.</td></tr>}
        </tbody></table></div></section>
      </>}

      {tab==='planejamento' && <>
        <section className="layout">
          <div className="panel form"><h2><Calculator size={18}/> Planejamento do próximo ciclo</h2><div className="form-grid">
            <input placeholder="Salário previsto" type="number" step="0.01" value={planejamento.salario} onChange={e=>setPlanejamento({...planejamento,salario:e.target.value})}/>
            <input placeholder="Bônus previsto" type="number" step="0.01" value={planejamento.bonus} onChange={e=>setPlanejamento({...planejamento,bonus:e.target.value})}/>
            <input placeholder="Receitas extras previstas" type="number" step="0.01" value={planejamento.extras} onChange={e=>setPlanejamento({...planejamento,extras:e.target.value})}/>
            <input placeholder="Fatura estimada manual" type="number" step="0.01" value={planejamento.fatura} onChange={e=>setPlanejamento({...planejamento,fatura:e.target.value})}/>
            <input placeholder="Meta mínima de aporte" type="number" step="0.01" value={planejamento.aporteMinimo} onChange={e=>setPlanejamento({...planejamento,aporteMinimo:e.target.value})}/>
            <input placeholder="Caixa desejado" type="number" step="0.01" value={planejamento.caixaDesejado} onChange={e=>setPlanejamento({...planejamento,caixaDesejado:e.target.value})}/>
          </div><p className="chart-note">A fatura estimada é manual. Compromissos no crédito cadastrados aparecem abaixo como referência, sem somar automaticamente.</p></div>
          <div className="panel"><h2>Resultado do planejamento</h2><div className="simple-list">
            <div><span>Receitas previstas</span><b>{money(planejamentoCalc.receitas)}</b></div>
            <div><span>Fatura estimada</span><b>{money(planejamentoCalc.fatura)}</b></div>
            <div><span>Compromissos do próximo ciclo</span><b>{money(planejamentoCalc.compromissosProximo)}</b></div>
            <div><span>Meta mínima de aporte</span><b>{money(planejamentoCalc.aporte)}</b></div>
            <div><span>Caixa desejado</span><b>{money(planejamentoCalc.caixaDesejado)}</b></div>
            <div><span>Necessidade de resgate</span><b className={planejamentoCalc.resgateNecessario>0?'red':'green'}>{money(planejamentoCalc.resgateNecessario)}</b></div>
            <div><span>Aporte extra possível</span><b className="green">{money(planejamentoCalc.aporteExtra)}</b></div>
            <div><span>Meta diária sugerida</span><b>{money(planejamentoCalc.metaDiaria)}</b></div>
            <div><span>Saúde do ciclo</span><b className={planejamentoCalc.saude==='Crítico'?'red':planejamentoCalc.saude==='Atenção'?'':'green'}>{planejamentoCalc.saude}</b></div>
          </div></div>
        </section>
        <section className="layout">
          <div className="panel"><h2>Referências automáticas</h2><div className="simple-list">
            <div><span>Próximo ciclo</span><b>{formatBR(planejamentoCalc.proximo.start)} até {formatBR(planejamentoCalc.proximo.end)}</b></div>
            <div><span>Compromissos no crédito cadastrados</span><b>{money(planejamentoCalc.compromissosCredito)}</b></div>
            <div><span>Fatura atual do ciclo</span><b>{money(dash.credito)}</b></div>
          </div><p className="chart-note">Use esses valores apenas como referência para preencher a fatura estimada manual.</p></div>
          <div className="panel"><h2>Leitura rápida</h2><p className="chart-note">Se a necessidade de resgate for zero e houver aporte extra, o ciclo está excelente. Se houver resgate necessário, o sistema indica quanto precisaria sair da XP para manter caixa e aporte mínimos.</p></div>
        </section>
      </>}

      {tab==='analises' && <>
        <section className="panel"><h2>Calendário do ciclo</h2>
          <div className="calendar-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
          <div className="calendar-grid">
          {calendarioCiclo.map(d=>d.blank
            ? <div key={d.key} className="calendar-day calendar-blank"></div>
            : <div key={d.key} className={`calendar-day ${d.nivel}`} title={`${formatBR(d.data)} (${d.semana}) • Gastos variáveis: ${money(d.total)} • ${d.quantidade} lançamento(s)${d.maior ? ` • Maior gasto: ${d.maior.descricao} - ${money(d.maior.valor)}` : ''}`}><strong>{d.dia}</strong><small>{d.semana}</small><span>{money(d.total)}</span></div>
          )}
        </div><p className="chart-note">Cores por gasto variável diário: acima de R$ 50, R$ 100 e R$ 200. O total considera apenas despesas reais marcadas como Gastos Variáveis.</p></section>
        <section className="layout">
          <div className="panel"><h2>Gastos reais por categoria</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={porCategoria} dataKey="valor" nameKey="categoria" outerRadius={100} label={false}>{porCategoria.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v,n)=>[money(v), `${n} • ${pct(v,dash.receitaTotal)}`]}/></PieChart></ResponsiveContainer></div><p className="chart-note">Passe o mouse sobre o gráfico para ver valores. A legenda detalhada fica no resumo por categoria.</p></div>
          <div className="panel"><h2>Gastos variáveis por dia</h2><div className="chart"><ResponsiveContainer width="100%" height={280}><LineChart data={porDiaVariavel}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="dia"/><YAxis/><Tooltip formatter={(v)=>money(v)}/><Line type="monotone" dataKey="valor" strokeWidth={3} dot stroke="#60a5fa"/></LineChart></ResponsiveContainer></div></div>
        </section>
        <section className="layout">
          <div className="panel"><h2>Gastos reais por conta</h2><div className="chart"><ResponsiveContainer width="100%" height={240}><BarChart data={porConta}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="conta"/><YAxis/><Tooltip formatter={(v)=>money(v)}/><Bar dataKey="valor" radius={[8,8,0,0]}>{porConta.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
          <div className="panel"><h2>Gastos fixos x variáveis</h2><div className="chart"><ResponsiveContainer width="100%" height={240}><BarChart data={fixosVariaveis}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="natureza"/><YAxis/><Tooltip formatter={(v)=>money(v)}/><Bar dataKey="valor" radius={[8,8,0,0]}>{fixosVariaveis.map((_,i)=><Cell key={i} fill={COLORS[i+4]}/>)}</Bar></BarChart></ResponsiveContainer></div></div>
        </section>
        <section className="layout">
          <div className="panel"><h2>Resumo por categoria</h2><div className="simple-list">{porCategoria.map((c,i)=><div key={c.categoria}><span><b className="dot" style={{background:COLORS[i%COLORS.length]}}></b>{c.categoria}</span><b>{money(c.valor)} • {pct(c.valor,dash.receitaTotal)}</b></div>)}</div></div>
          <div className="panel"><h2>Resumo fixos x variáveis</h2><div className="simple-list">{fixosVariaveis.map((n,i)=><div key={n.natureza}><span><b className="dot" style={{background:COLORS[i+4]}}></b>{n.natureza}</span><b>{money(n.valor)} • {pct(n.valor,dash.receitaTotal)}</b></div>)}</div></div>
        </section>
      </>}
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>)
