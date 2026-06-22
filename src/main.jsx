import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import {
  PieChart, Pie, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts'
import { Plus, LogOut, Trash2, Download, WalletCards, TrendingUp, AlertTriangle } from 'lucide-react'
import './styles.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const CATEGORIAS = ['Alimentação','Lazer','Transporte','Saúde','Utilidades','Festa/Bebida','Automóvel','Outros']
const CONTAS = ['Nubank','Inter','XP']
const FORMAS = ['Débito/PIX','Crédito']
const NATUREZAS = ['Gastos Fixos','Gastos Variáveis']
const TIPOS = ['Despesa','Receita Prevista','Investimento','Pagamento Fatura']

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function cycleFromDate(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  let start
  if (d >= 12) start = new Date(y, m, 12)
  else start = new Date(y, m - 1, 12)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 12)
  return { start, end }
}

function toIso(d) {
  return d.toISOString().slice(0, 10)
}

function formatBR(iso) {
  return iso.split('-').reverse().join('/')
}

function diffDaysInclusive(startIso, endIso) {
  const a = new Date(startIso + 'T00:00:00')
  const b = new Date(endIso + 'T00:00:00')
  return Math.max(1, Math.floor((b - a) / 86400000) + 1)
}

function AuthScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    setLoading(false)
    if (error) alert(error.message)
    else setSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand-icon"><WalletCards size={34}/></div>
        <h1>Controle de Gastos</h1>
        <p>Seu painel financeiro por ciclo: dia 12 até dia 12.</p>
        <form onSubmit={signIn}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu e-mail" required />
          <button disabled={loading}>{loading ? 'Enviando...' : 'Entrar com link mágico'}</button>
        </form>
        {sent && <div className="success">Link enviado. Confira seu e-mail.</div>}
      </div>
    </div>
  )
}

function App() {
  const defaultCycle = cycleFromDate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transacoes, setTransacoes] = useState([])
  const [inicioCiclo, setInicioCiclo] = useState(toIso(defaultCycle.start))
  const [fimCiclo, setFimCiclo] = useState(toIso(defaultCycle.end))
  const [metaAporte, setMetaAporte] = useState(Number(localStorage.getItem('metaAporteLeo') || 600))
  const [saldoInicialPix, setSaldoInicialPix] = useState(Number(localStorage.getItem('saldoInicialPixLeo') || 0))

  const [form, setForm] = useState({
    data: isoToday(),
    tipo: 'Despesa',
    categoria: 'Alimentação',
    conta: 'Inter',
    forma: 'Débito/PIX',
    natureza: 'Gastos Variáveis',
    descricao: '',
    valor: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) carregar()
  }, [session, inicioCiclo, fimCiclo])

  useEffect(() => localStorage.setItem('metaAporteLeo', String(metaAporte)), [metaAporte])
  useEffect(() => localStorage.setItem('saldoInicialPixLeo', String(saldoInicialPix)), [saldoInicialPix])

  async function carregar() {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .gte('data', inicioCiclo)
      .lt('data', fimCiclo)
      .order('data', { ascending: false })

    if (error) alert(error.message)
    else setTransacoes(data || [])
  }

  async function adicionar(e) {
    e.preventDefault()
    const valor = Number(String(form.valor).replace(',', '.'))
    if (!valor || valor <= 0) return alert('Informe um valor válido.')

    const payload = {
      ...form,
      valor,
      user_id: session.user.id
    }

    const { error } = await supabase.from('transacoes').insert(payload)
    if (error) alert(error.message)
    else {
      setForm({ ...form, data: isoToday(), descricao: '', valor: '' })
      carregar()
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    const { error } = await supabase.from('transacoes').delete().eq('id', id)
    if (error) alert(error.message)
    else carregar()
  }

  function aplicarCicloAtual() {
    const c = cycleFromDate()
    setInicioCiclo(toIso(c.start))
    setFimCiclo(toIso(c.end))
  }

  function proximoCiclo() {
    const s = new Date(inicioCiclo + 'T00:00:00')
    const e = new Date(fimCiclo + 'T00:00:00')
    setInicioCiclo(toIso(new Date(s.getFullYear(), s.getMonth() + 1, 12)))
    setFimCiclo(toIso(new Date(e.getFullYear(), e.getMonth() + 1, 12)))
  }

  function cicloAnterior() {
    const s = new Date(inicioCiclo + 'T00:00:00')
    const e = new Date(fimCiclo + 'T00:00:00')
    setInicioCiclo(toIso(new Date(s.getFullYear(), s.getMonth() - 1, 12)))
    setFimCiclo(toIso(new Date(e.getFullYear(), e.getMonth() - 1, 12)))
  }

  const dash = useMemo(() => {
    const receitaPrevista = transacoes.filter(t => t.tipo === 'Receita Prevista').reduce((s,t) => s + Number(t.valor), 0)
    const despesas = transacoes.filter(t => t.tipo === 'Despesa').reduce((s,t) => s + Number(t.valor), 0)
    const investimentos = transacoes.filter(t => t.tipo === 'Investimento').reduce((s,t) => s + Number(t.valor), 0)
    const pagamentosFatura = transacoes.filter(t => t.tipo === 'Pagamento Fatura').reduce((s,t) => s + Number(t.valor), 0)
    const gastosFixos = transacoes.filter(t => t.natureza === 'Gastos Fixos' && t.tipo !== 'Receita Prevista').reduce((s,t) => s + Number(t.valor), 0)
    const gastosVariaveis = transacoes.filter(t => t.natureza === 'Gastos Variáveis' && t.tipo !== 'Receita Prevista').reduce((s,t) => s + Number(t.valor), 0)
    const debitoPix = transacoes.filter(t => t.forma === 'Débito/PIX' && t.tipo !== 'Receita Prevista').reduce((s,t) => s + Number(t.valor), 0)
    const credito = transacoes.filter(t => t.forma === 'Crédito' && t.tipo !== 'Receita Prevista').reduce((s,t) => s + Number(t.valor), 0)

    const saldoCiclo = saldoInicialPix + receitaPrevista - despesas - investimentos - pagamentosFatura
    const faltaAporte = Math.max(0, metaAporte - investimentos)

    const hojeIso = isoToday()
    const dataReferencia = hojeIso < inicioCiclo ? inicioCiclo : hojeIso >= fimCiclo ? inicioCiclo : hojeIso
    const diasPassados = diffDaysInclusive(inicioCiclo, dataReferencia)
    const diasTotal = diffDaysInclusive(inicioCiclo, fimCiclo)
    const diasRestantes = Math.max(0, diasTotal - diasPassados)
    const mediaVariavelDia = gastosVariaveis / Math.max(1, diasPassados)
    const projecaoVariavelRestante = mediaVariavelDia * diasRestantes
    const projecaoTotalCiclo = despesas + investimentos + pagamentosFatura + projecaoVariavelRestante
    const saldoProjetado = saldoInicialPix + receitaPrevista - projecaoTotalCiclo

    return {
      receitaPrevista, despesas, investimentos, pagamentosFatura, gastosFixos, gastosVariaveis,
      debitoPix, credito, saldoCiclo, faltaAporte, diasPassados, diasRestantes,
      mediaVariavelDia, projecaoVariavelRestante, projecaoTotalCiclo, saldoProjetado
    }
  }, [transacoes, metaAporte, saldoInicialPix, inicioCiclo, fimCiclo])

  const porCategoria = useMemo(() => {
    const map = {}
    transacoes.filter(t => t.tipo !== 'Receita Prevista').forEach(t => map[t.categoria] = (map[t.categoria] || 0) + Number(t.valor))
    return Object.entries(map).map(([categoria, valor]) => ({ categoria, valor })).sort((a,b) => b.valor - a.valor)
  }, [transacoes])

  const porConta = useMemo(() => {
    const map = {}
    transacoes.filter(t => t.tipo !== 'Receita Prevista').forEach(t => map[t.conta] = (map[t.conta] || 0) + Number(t.valor))
    return Object.entries(map).map(([conta, valor]) => ({ conta, valor }))
  }, [transacoes])

  const porForma = useMemo(() => {
    const map = {}
    transacoes.filter(t => t.tipo !== 'Receita Prevista').forEach(t => map[t.forma] = (map[t.forma] || 0) + Number(t.valor))
    return Object.entries(map).map(([forma, valor]) => ({ forma, valor }))
  }, [transacoes])

  const porDia = useMemo(() => {
    const map = {}
    transacoes.filter(t => t.tipo !== 'Receita Prevista').forEach(t => {
      const dia = t.data.slice(8,10) + '/' + t.data.slice(5,7)
      map[dia] = (map[dia] || 0) + Number(t.valor)
    })
    return Object.entries(map).map(([dia, valor]) => ({ dia, valor }))
  }, [transacoes])

  const analiseVariavel = useMemo(() => {
    const variaveis = transacoes.filter(t => t.natureza === 'Gastos Variáveis' && t.tipo !== 'Receita Prevista')
    const porData = {}
    variaveis.forEach(t => porData[t.data] = (porData[t.data] || 0) + Number(t.valor))
    const diasMaisCaros = Object.entries(porData)
      .map(([data, valor]) => ({ data, valor }))
      .sort((a,b) => b.valor - a.valor)
      .slice(0, 5)
    const maioresCompras = [...variaveis].sort((a,b) => Number(b.valor) - Number(a.valor)).slice(0, 5)
    return { diasMaisCaros, maioresCompras }
  }, [transacoes])

  const faturas = useMemo(() => {
    const map = { Nubank: 0, Inter: 0, XP: 0 }
    transacoes.filter(t => t.forma === 'Crédito' && t.tipo !== 'Receita Prevista').forEach(t => map[t.conta] += Number(t.valor))
    return Object.entries(map).map(([conta, valor]) => ({ conta, valor }))
  }, [transacoes])

  function exportarCSV() {
    const linhas = [['Data','Tipo','Categoria','Conta','Forma','Natureza','Descrição','Valor']]
    transacoes.forEach(t => linhas.push([t.data, t.tipo, t.categoria, t.conta, t.forma, t.natureza, t.descricao, t.valor]))
    const csv = linhas.map(l => l.map(c => `"${String(c).replaceAll('"','""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `controle-gastos-${inicioCiclo}-a-${fimCiclo}.csv`
    a.click()
  }

  if (loading) return <div className="loading">Carregando...</div>
  if (!session) return <AuthScreen />

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Controle de Gastos</h1>
          <p>Ciclo financeiro: {formatBR(inicioCiclo)} até {formatBR(fimCiclo)} • {session.user.email}</p>
        </div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={16}/> Sair</button>
      </header>

      <main>
        <section className="toolbar">
          <button className="ghost" onClick={cicloAnterior}>← Ciclo anterior</button>
          <button className="ghost" onClick={aplicarCicloAtual}>Ciclo atual</button>
          <button className="ghost" onClick={proximoCiclo}>Próximo ciclo →</button>
          <label>Início</label><input type="date" value={inicioCiclo} onChange={e => setInicioCiclo(e.target.value)} />
          <label>Fim</label><input type="date" value={fimCiclo} onChange={e => setFimCiclo(e.target.value)} />
          <button className="ghost" onClick={exportarCSV}><Download size={16}/> Exportar CSV</button>
        </section>

        <section className="settings-row">
          <div className="mini-setting">
            <span>Saldo inicial no PIX/Débito</span>
            <input type="number" step="0.01" value={saldoInicialPix} onChange={e => setSaldoInicialPix(Number(e.target.value || 0))} />
          </div>
          <div className="mini-setting">
            <span>Meta mensal de aporte</span>
            <input type="number" step="0.01" value={metaAporte} onChange={e => setMetaAporte(Number(e.target.value || 0))} />
          </div>
        </section>

        <section className="cards">
          <div className="card"><span>Receita prevista</span><strong className="green">{money(dash.receitaPrevista)}</strong></div>
          <div className="card"><span>Despesas lançadas</span><strong className="red">{money(dash.despesas + dash.pagamentosFatura)}</strong></div>
          <div className="card"><span>Investido no ciclo</span><strong>{money(dash.investimentos)}</strong><small>Falta: {money(dash.faltaAporte)}</small></div>
          <div className="card"><span>Saldo atual do ciclo</span><strong className={dash.saldoCiclo >= 0 ? 'green' : 'red'}>{money(dash.saldoCiclo)}</strong></div>
        </section>

        <section className="cards">
          <div className="card"><span>Débito/PIX usado</span><strong>{money(dash.debitoPix)}</strong></div>
          <div className="card"><span>Crédito usado</span><strong>{money(dash.credito)}</strong></div>
          <div className="card"><span>Gastos fixos</span><strong>{money(dash.gastosFixos)}</strong></div>
          <div className="card"><span>Gastos variáveis</span><strong>{money(dash.gastosVariaveis)}</strong></div>
        </section>

        <section className="projection">
          <div>
            <h2><TrendingUp size={19}/> Projeção do ciclo</h2>
            <p>Com base no seu gasto variável médio de <b>{money(dash.mediaVariavelDia)}/dia</b>, faltando <b>{dash.diasRestantes}</b> dias, a projeção de gasto variável restante é <b>{money(dash.projecaoVariavelRestante)}</b>.</p>
          </div>
          <div className={dash.saldoProjetado >= 0 ? 'projection-number green' : 'projection-number red'}>
            <span>Saldo projetado no fim do ciclo</span>
            <strong>{money(dash.saldoProjetado)}</strong>
          </div>
        </section>

        {dash.saldoProjetado < metaAporte && (
          <section className="warning">
            <AlertTriangle size={18}/>
            Atenção: pelo ritmo atual, seu saldo projetado pode ficar apertado em relação à meta de aporte.
          </section>
        )}

        <section className="layout">
          <form className="panel form" onSubmit={adicionar}>
            <h2><Plus size={18}/> Novo lançamento</h2>
            <div className="form-grid">
              <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} required />
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>{TIPOS.map(x => <option key={x}>{x}</option>)}</select>
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}>{CATEGORIAS.map(x => <option key={x}>{x}</option>)}</select>
              <select value={form.conta} onChange={e => setForm({...form, conta: e.target.value})}>{CONTAS.map(x => <option key={x}>{x}</option>)}</select>
              <select value={form.forma} onChange={e => setForm({...form, forma: e.target.value})}>{FORMAS.map(x => <option key={x}>{x}</option>)}</select>
              <select value={form.natureza} onChange={e => setForm({...form, natureza: e.target.value})}>{NATUREZAS.map(x => <option key={x}>{x}</option>)}</select>
              <input className="wide" placeholder="Descrição" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} required />
              <input placeholder="Valor" type="number" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} required />
            </div>
            <button>Adicionar lançamento</button>
          </form>

          <div className="panel">
            <h2>Gastos por categoria</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="categoria" outerRadius={100} label />
                  <Tooltip formatter={(v) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="layout">
          <div className="panel">
            <h2>Gastos por conta/cartão</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porConta}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="conta" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="valor" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h2>Evolução diária do ciclo</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="valor" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="layout">
          <div className="panel">
            <h2>Faturas por cartão</h2>
            <div className="simple-list">
              {faturas.map(f => <div key={f.conta}><span>{f.conta}</span><b>{money(f.valor)}</b></div>)}
            </div>
          </div>
          <div className="panel">
            <h2>Débito/PIX vs Crédito</h2>
            <div className="chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porForma}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="forma" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="valor" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="layout">
          <div className="panel">
            <h2>Dias com mais gastos variáveis</h2>
            <div className="simple-list">
              {analiseVariavel.diasMaisCaros.map(d => <div key={d.data}><span>{formatBR(d.data)}</span><b>{money(d.valor)}</b></div>)}
              {analiseVariavel.diasMaisCaros.length === 0 && <p className="muted">Sem gastos variáveis no ciclo.</p>}
            </div>
          </div>
          <div className="panel">
            <h2>Maiores compras variáveis</h2>
            <div className="simple-list">
              {analiseVariavel.maioresCompras.map(c => <div key={c.id}><span>{c.descricao} • {c.categoria}</span><b>{money(c.valor)}</b></div>)}
              {analiseVariavel.maioresCompras.length === 0 && <p className="muted">Sem compras variáveis no ciclo.</p>}
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Lançamentos do ciclo</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Forma</th><th>Natureza</th><th>Descrição</th><th>Valor</th><th></th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map(t => (
                  <tr key={t.id}>
                    <td>{formatBR(t.data)}</td>
                    <td>{t.tipo}</td>
                    <td>{t.categoria}</td>
                    <td>{t.conta}</td>
                    <td>{t.forma}</td>
                    <td>{t.natureza}</td>
                    <td>{t.descricao}</td>
                    <td>{money(t.valor)}</td>
                    <td><button className="danger" onClick={() => excluir(t.id)}><Trash2 size={14}/></button></td>
                  </tr>
                ))}
                {transacoes.length === 0 && <tr><td colSpan="9" className="empty">Nenhum lançamento neste ciclo.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
