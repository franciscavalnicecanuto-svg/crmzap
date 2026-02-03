import { create } from 'zustand'

export type LeadStatus = 'novo' | 'em_contato' | 'negociando' | 'fechado' | 'perdido'

export interface Message {
  id: string
  text: string
  timestamp: Date
  fromMe: boolean
}

export interface Lead {
  id: string
  name: string
  phone: string
  avatar?: string
  status: LeadStatus
  lastMessage?: string
  lastMessageAt?: Date
  notes?: string
  value?: number
  tags: string[]
  followUpAt?: Date
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  whatsappId?: string // JID do WhatsApp
}

interface LeadsState {
  leads: Lead[]
  selectedLeadId: string | null
  connectionState: 'disconnected' | 'connecting' | 'connected'
  
  // Lead actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => void
  updateLead: (id: string, updates: Partial<Lead>) => void
  deleteLead: (id: string) => void
  moveLead: (id: string, status: LeadStatus) => void
  selectLead: (id: string | null) => void
  
  // Message actions
  addMessage: (leadId: string, message: Omit<Message, 'id'>) => void
  syncMessages: (leadId: string, messages: Message[]) => void
  
  // Queries
  getLeadsByStatus: (status: LeadStatus) => Lead[]
  getPendingFollowUps: () => Lead[]
  getSelectedLead: () => Lead | null
  findLeadByPhone: (phone: string) => Lead | null
  
  // Connection
  setConnectionState: (state: 'disconnected' | 'connecting' | 'connected') => void
  
  // Sync from WhatsApp
  syncFromWhatsApp: (contacts: { phone: string; name: string; lastMessage?: string; whatsappId?: string }[]) => void
}

export const useLeadsStore = create<LeadsState>()(
    (set, get) => ({
      leads: [],
      selectedLeadId: null,
      connectionState: 'disconnected',
      
      addLead: (lead) => set((state) => ({
        leads: [...state.leads, {
          ...lead,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        }]
      })),
      
      updateLead: (id, updates) => set((state) => ({
        leads: state.leads.map(lead => 
          lead.id === id 
            ? { ...lead, ...updates, updatedAt: new Date() }
            : lead
        )
      })),
      
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter(lead => lead.id !== id),
        selectedLeadId: state.selectedLeadId === id ? null : state.selectedLeadId,
      })),
      
      moveLead: (id, status) => set((state) => ({
        leads: state.leads.map(lead =>
          lead.id === id
            ? { ...lead, status, updatedAt: new Date() }
            : lead
        )
      })),
      
      selectLead: (id) => set({ selectedLeadId: id }),
      
      addMessage: (leadId, message) => set((state) => ({
        leads: state.leads.map(lead =>
          lead.id === leadId
            ? {
                ...lead,
                messages: [...lead.messages, { ...message, id: crypto.randomUUID() }],
                lastMessage: message.text,
                lastMessageAt: message.timestamp,
                updatedAt: new Date(),
              }
            : lead
        )
      })),
      
      syncMessages: (leadId, messages) => set((state) => ({
        leads: state.leads.map(lead =>
          lead.id === leadId
            ? {
                ...lead,
                messages,
                lastMessage: messages.length > 0 ? messages[messages.length - 1].text : lead.lastMessage,
                lastMessageAt: messages.length > 0 ? messages[messages.length - 1].timestamp : lead.lastMessageAt,
                updatedAt: new Date(),
              }
            : lead
        )
      })),
      
      getLeadsByStatus: (status) => {
        return get().leads.filter(lead => lead.status === status)
      },
      
      getPendingFollowUps: () => {
        const now = new Date()
        return get().leads.filter(lead => 
          lead.followUpAt && new Date(lead.followUpAt) <= now && lead.status !== 'fechado' && lead.status !== 'perdido'
        )
      },
      
      getSelectedLead: () => {
        const { leads, selectedLeadId } = get()
        return leads.find(l => l.id === selectedLeadId) || null
      },
      
      findLeadByPhone: (phone) => {
        const cleanPhone = phone.replace(/\D/g, '')
        return get().leads.find(lead => 
          lead.phone.replace(/\D/g, '') === cleanPhone ||
          lead.whatsappId?.includes(cleanPhone)
        ) || null
      },
      
      setConnectionState: (connectionState) => set({ connectionState }),
      
      syncFromWhatsApp: (contacts) => set((state) => {
        const updatedLeads = [...state.leads]
        
        contacts.forEach(contact => {
          const cleanPhone = contact.phone.replace(/\D/g, '')
          const existingIndex = updatedLeads.findIndex(l => 
            l.phone.replace(/\D/g, '') === cleanPhone ||
            l.whatsappId === contact.whatsappId
          )
          
          if (existingIndex >= 0) {
            // Update existing lead
            updatedLeads[existingIndex] = {
              ...updatedLeads[existingIndex],
              name: contact.name || updatedLeads[existingIndex].name,
              lastMessage: contact.lastMessage || updatedLeads[existingIndex].lastMessage,
              lastMessageAt: contact.lastMessage ? new Date() : updatedLeads[existingIndex].lastMessageAt,
              whatsappId: contact.whatsappId,
              updatedAt: new Date(),
            }
          } else {
            // Add new lead
            updatedLeads.push({
              id: crypto.randomUUID(),
              name: contact.name || cleanPhone,
              phone: contact.phone,
              whatsappId: contact.whatsappId,
              status: 'novo',
              lastMessage: contact.lastMessage,
              lastMessageAt: contact.lastMessage ? new Date() : undefined,
              tags: ['whatsapp'],
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        })
        
        return { leads: updatedLeads }
      }),
    })
)

// Demo data for first-time users
export const demoLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'messages'>[] = [
  {
    name: 'Maria Santos',
    phone: '+55 11 99999-1234',
    status: 'novo',
    lastMessage: 'Oi, vi seu anúncio. Quanto custa?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
    tags: ['instagram', 'interessado'],
  },
  {
    name: 'João Silva',
    phone: '+55 11 98888-5678',
    status: 'em_contato',
    lastMessage: 'Vou pensar e te aviso amanhã',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    followUpAt: new Date(Date.now() - 1000 * 60 * 60),
    tags: ['whatsapp', 'retornar'],
    value: 500,
  },
  {
    name: 'Ana Costa',
    phone: '+55 21 97777-9012',
    status: 'negociando',
    lastMessage: 'Fechamos em 3x sem juros?',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    tags: ['indicação', 'vip'],
    value: 1200,
  },
  {
    name: 'Pedro Oliveira',
    phone: '+55 31 96666-3456',
    status: 'fechado',
    lastMessage: 'Pix enviado! ✅',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    tags: ['cliente'],
    value: 800,
  },
  {
    name: 'Carla Lima',
    phone: '+55 11 95555-7890',
    status: 'perdido',
    lastMessage: 'Achei mais barato em outro lugar',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    tags: ['preço'],
    notes: 'Pesquisar concorrência',
  },
]
