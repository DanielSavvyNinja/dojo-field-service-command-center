import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { format, addDays, startOfWeek, isSameDay, parseISO, setHours, setMinutes } from 'date-fns'
import { Calendar, Clock, MapPin, Phone, User, Plus, ChevronLeft, ChevronRight, Filter, LayoutGrid, Map, List, Settings, Bell, Search, MoreVertical, GripVertical, CheckCircle2, AlertCircle, Wrench, Home, Truck } from 'lucide-react'

// ─── DEMO DATA ────────────────────────────────────────────────
const TECHNICIANS = [
  { id: 't1', name: 'Mike Johnson', color: '#3b82f6', avatar: 'MJ', phone: '(555) 123-4567', status: 'active' },
  { id: 't2', name: 'Sarah Chen', color: '#10b981', avatar: 'SC', phone: '(555) 234-5678', status: 'active' },
  { id: 't3', name: 'James Wilson', color: '#f59e0b', avatar: 'JW', phone: '(555) 345-6789', status: 'active' },
  { id: 't4', name: 'Maria Garcia', color: '#8b5cf6', avatar: 'MG', phone: '(555) 456-7890', status: 'active' },
]

const JOB_STATUSES = {
  unscheduled: { label: 'Unscheduled', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

const SERVICE_TYPES = {
  'standard-clean': { label: 'Standard Cleaning', duration: 60, price: 139, icon: '🔧' },
  'deep-clean': { label: 'Deep Clean (20+ ft)', duration: 90, price: 219, icon: '🔧' },
  'roof-clean': { label: 'Roof-Level Cleaning', duration: 90, price: 249, icon: '🏠' },
  'inspection': { label: 'Inspection Only', duration: 30, price: 69, icon: '🔍' },
  'bird-guard': { label: 'Bird Guard Install', duration: 45, price: 125, icon: '🐦' },
  'vent-cap': { label: 'Vent Cap Replace', duration: 45, price: 135, icon: '🔩' },
  'reroute': { label: 'Vent Re-Route', duration: 180, price: 500, icon: '🛠️' },
  'commercial': { label: 'Commercial (per unit)', duration: 30, price: 99, icon: '🏢' },
  'maintenance-plan': { label: 'Annual Maintenance', duration: 60, price: 149, icon: '📋' },
}

const today = new Date()
const generateDemoJobs = () => {
  const jobs = [
    { id: 'j1', customerName: 'Robert Thompson', address: '123 Oak Lane', city: 'Placerville', phone: '(530) 555-0101', serviceType: 'standard-clean', status: 'scheduled', techId: 't1', date: format(today, 'yyyy-MM-dd'), startTime: '08:00', notes: 'Regular customer, annual cleaning', propertyType: 'Single Family' },
    { id: 'j2', customerName: 'Lisa Martinez', address: '456 Pine St', city: 'El Dorado Hills', phone: '(916) 555-0202', serviceType: 'deep-clean', status: 'scheduled', techId: 't1', date: format(today, 'yyyy-MM-dd'), startTime: '10:00', notes: 'Long vent run, needs 20ft snake', propertyType: 'Single Family' },
    { id: 'j3', customerName: 'David Park', address: '789 Elm Ave', city: 'Cameron Park', phone: '(530) 555-0303', serviceType: 'inspection', status: 'scheduled', techId: 't2', date: format(today, 'yyyy-MM-dd'), startTime: '08:30', notes: 'New customer from Google', propertyType: 'Townhouse' },
    { id: 'j4', customerName: 'Jennifer Walsh', address: '321 Maple Dr', city: 'Placerville', phone: '(530) 555-0404', serviceType: 'standard-clean', status: 'in-progress', techId: 't2', date: format(today, 'yyyy-MM-dd'), startTime: '10:30', notes: 'Has 2 dryers', propertyType: 'Single Family' },
    { id: 'j5', customerName: 'Oak Creek Apartments', address: '500 Creek Rd', city: 'Folsom', phone: '(916) 555-0505', serviceType: 'commercial', status: 'scheduled', techId: 't3', date: format(today, 'yyyy-MM-dd'), startTime: '09:00', notes: '8 units - Building B', propertyType: 'Multi-Unit', units: 8 },
    { id: 'j6', customerName: 'Tom Bradley', address: '678 Valley View', city: 'Shingle Springs', phone: '(530) 555-0606', serviceType: 'bird-guard', status: 'completed', techId: 't3', date: format(today, 'yyyy-MM-dd'), startTime: '07:30', notes: 'Completed - birds nesting in vent cap', propertyType: 'Single Family' },
    { id: 'j7', customerName: 'Susan Clark', address: '234 Hillside Way', city: 'Placerville', phone: '(530) 555-0707', serviceType: 'reroute', status: 'scheduled', techId: 't4', date: format(today, 'yyyy-MM-dd'), startTime: '08:00', notes: 'Flex-to-rigid conversion, 15ft run', propertyType: 'Single Family' },
    { id: 'j8', customerName: 'Amy Chen', address: '890 Gold Trail', city: 'Placerville', phone: '(530) 555-0808', serviceType: 'standard-clean', status: 'unscheduled', techId: null, date: format(today, 'yyyy-MM-dd'), startTime: null, notes: 'Called in today, wants ASAP', propertyType: 'Single Family' },
    { id: 'j9', customerName: 'Mark Stevens', address: '147 Sierra Blvd', city: 'Cameron Park', phone: '(530) 555-0909', serviceType: 'maintenance-plan', status: 'unscheduled', techId: null, date: format(today, 'yyyy-MM-dd'), startTime: null, notes: 'Annual plan member - due for service', propertyType: 'Single Family' },
    { id: 'j10', customerName: 'Pine Ridge HOA', address: '200 Pine Ridge Ct', city: 'El Dorado Hills', phone: '(916) 555-1010', serviceType: 'commercial', status: 'unscheduled', techId: null, date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: null, notes: '12 units, common laundry room', propertyType: 'Multi-Unit', units: 12 },
    { id: 'j11', customerName: 'Karen White', address: '345 Sunset Dr', city: 'Placerville', phone: '(530) 555-1111', serviceType: 'roof-clean', status: 'scheduled', techId: 't1', date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '09:00', notes: '2-story, roof access needed', propertyType: 'Single Family' },
    { id: 'j12', customerName: 'Brian Foster', address: '567 Main St', city: 'Placerville', phone: '(530) 555-1212', serviceType: 'vent-cap', status: 'scheduled', techId: 't2', date: format(addDays(today, 1), 'yyyy-MM-dd'), startTime: '08:00', notes: 'Replace damaged vent cap', propertyType: 'Single Family' },
  ]
  return jobs
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7) // 7 AM to 6 PM

// ─── COMPONENTS ───────────────────────────────────────────────

function JobCard({ job, compact = false, onDragStart, onJobClick }) {
  const service = SERVICE_TYPES[job.serviceType]
  const status = JOB_STATUSES[job.status]
  const tech = TECHNICIANS.find(t => t.id === job.techId)

  return (
    <div
      className={`job-card ${compact ? 'p-2' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('jobId', job.id)
        onDragStart?.(job.id)
      }}
      onClick={() => onJobClick?.(job)}
      style={tech ? { borderLeft: `3px solid ${tech.color}` } : { borderLeft: '3px solid #9ca3af' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0`}></span>
            <span className="font-semibold text-sm truncate">{job.customerName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <MapPin size={10} /> {job.address}
          </div>
          {!compact && (
            <>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Wrench size={10} /> {service?.label}
              </div>
              {job.startTime && (
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Clock size={10} /> {job.startTime} ({service?.duration}min)
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge ${status.color}`}>{status.label}</span>
          {!compact && <span className="text-xs font-semibold text-green-600">${service?.price}</span>}
        </div>
      </div>
      {!compact && job.notes && (
        <div className="mt-2 text-xs text-gray-400 italic truncate">{job.notes}</div>
      )}
    </div>
  )
}

function TechHeader({ tech, jobCount, totalRevenue }) {
  return (
    <div className="p-3 border-b border-gray-200 bg-white rounded-t-lg">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: tech.color }}>
          {tech.avatar}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{tech.name}</div>
          <div className="text-xs text-gray-400">{jobCount} jobs · ${totalRevenue}</div>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400" title="Online"></div>
      </div>
    </div>
  )
}

function UnassignedQueue({ jobs, onDragStart, onJobClick }) {
  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-amber-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle size={16} />
            Unassigned Jobs
          </h3>
          <span className="badge bg-amber-200 text-amber-800">{jobs.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} compact onDragStart={onDragStart} onJobClick={onJobClick} />
        ))}
        {jobs.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-green-400" />
            All jobs assigned!
          </div>
        )}
      </div>
    </div>
  )
}

function NewJobModal({ isOpen, onClose, onSave, techs, selectedDate }) {
  const [form, setForm] = useState({
    customerName: '', address: '', city: '', phone: '', serviceType: 'standard-clean',
    techId: '', startTime: '09:00', notes: '', propertyType: 'Single Family'
  })

  if (!isOpen) return null

  const handleSave = () => {
    onSave({
      ...form,
      id: `j${Date.now()}`,
      status: form.techId ? 'scheduled' : 'unscheduled',
      date: format(selectedDate, 'yyyy-MM-dd'),
    })
    setForm({ customerName: '', address: '', city: '', phone: '', serviceType: 'standard-clean', techId: '', startTime: '09:00', notes: '', propertyType: 'Single Family' })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold">New Job</h2>
          <p className="text-sm text-gray-500">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dojo-500 focus:border-transparent" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})}>
                {Object.entries(SERVICE_TYPES).map(([key, svc]) => (
                  <option key={key} value={key}>{svc.icon} {svc.label} — ${svc.price}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.propertyType} onChange={e => setForm({...form, propertyType: e.target.value})}>
                <option>Single Family</option>
                <option>Townhouse</option>
                <option>Condo</option>
                <option>Multi-Unit</option>
                <option>Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Technician</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.techId} onChange={e => setForm({...form, techId: e.target.value})}>
                <option value="">— Unassigned —</option>
                {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="time" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.customerName || !form.address}>Create Job</button>
        </div>
      </div>
    </div>
  )
}

function JobDetailModal({ job, isOpen, onClose, onUpdate, techs }) {
  const [editJob, setEditJob] = useState(job)
  useEffect(() => { setEditJob(job) }, [job?.id])
  if (!isOpen || !job || !editJob) return null
  const status = JOB_STATUSES[editJob.status]
  const update = (patch) => setEditJob({ ...editJob, ...patch })
  const handleSave = () => {
    const newStatus = (editJob.techId && editJob.status === 'unscheduled') ? 'scheduled' : editJob.status
    onUpdate({ ...editJob, status: newStatus })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <input className="text-lg font-bold flex-1 border-b border-gray-200 focus:border-blue-500 focus:outline-none mr-4" value={editJob.customerName || ''} onChange={e => update({ customerName: e.target.value })} placeholder="Customer name" />
          <span className={`badge ${status.color}`}>{status.label}</span>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block"><span className="text-gray-500">Service</span>
              <select className="w-full border rounded px-2 py-1 mt-1" value={editJob.serviceType} onChange={e => update({ serviceType: e.target.value })}>
                {Object.entries(SERVICE_TYPES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-gray-500">Technician</span>
              <select className="w-full border rounded px-2 py-1 mt-1" value={editJob.techId || ''} onChange={e => update({ techId: e.target.value || null })}>
                <option value="">— Unassigned —</option>
                {TECHNICIANS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="block"><span className="text-gray-500">Date</span>
              <input type="date" className="w-full border rounded px-2 py-1 mt-1" value={editJob.date || ''} onChange={e => update({ date: e.target.value })} />
            </label>
            <label className="block"><span className="text-gray-500">Time</span>
              <input type="time" className="w-full border rounded px-2 py-1 mt-1" value={editJob.startTime || ''} onChange={e => update({ startTime: e.target.value })} />
            </label>
            <label className="block"><span className="text-gray-500">Phone</span>
              <input className="w-full border rounded px-2 py-1 mt-1" value={editJob.phone || ''} onChange={e => update({ phone: e.target.value })} />
            </label>
            <label className="block"><span className="text-gray-500">Property</span>
              <input className="w-full border rounded px-2 py-1 mt-1" value={editJob.propertyType || ''} onChange={e => update({ propertyType: e.target.value })} />
            </label>
            <label className="block col-span-2"><span className="text-gray-500">Address</span>
              <input className="w-full border rounded px-2 py-1 mt-1" value={editJob.address || ''} onChange={e => update({ address: e.target.value })} />
            </label>
            <label className="block col-span-2"><span className="text-gray-500">City</span>
              <input className="w-full border rounded px-2 py-1 mt-1" value={editJob.city || ''} onChange={e => update({ city: e.target.value })} />
            </label>
            <label className="block col-span-2"><span className="text-gray-500">Notes</span>
              <textarea rows={2} className="w-full border rounded px-2 py-1 mt-1" value={editJob.notes || ''} onChange={e => update({ notes: e.target.value })} />
            </label>
          </div>
          <div className="flex gap-2 flex-wrap pt-2 border-t">
            <span className="text-sm font-medium text-gray-700 w-full">Status</span>
            {Object.entries(JOB_STATUSES).map(([key, s]) => (
              <button key={key} className={`badge ${editJob.status === key ? s.color + ' ring-2 ring-offset-1 ring-gray-400' : 'bg-gray-100 text-gray-700'}`} onClick={() => update({ status: key })}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button className="text-sm text-red-500 hover:text-red-700">Delete Job</button>
          <div className="flex gap-2">
            <button className="text-sm text-gray-600 hover:text-gray-900" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────

export default function App() {
  const [jobs, setJobs] = useState(generateDemoJobs)
  const [selectedDate, setSelectedDate] = useState(today)
  const [view, setView] = useState('day') // day, week, list
  const [showNewJob, setShowNewJob] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const todayJobs = useMemo(() => jobs.filter(j => j.date === dateStr), [jobs, dateStr])
  const unassigned = useMemo(() => jobs.filter(j => !j.techId || j.status === 'unscheduled'), [jobs])

  const getJobsForTechAndDay = useCallback((techId, day) => {
    const d = format(day, 'yyyy-MM-dd')
    return jobs.filter(j => j.techId === techId && j.date === d && j.status !== 'unscheduled')
  }, [jobs])

  const getTechRevenue = (techId, day) => {
    return getJobsForTechAndDay(techId, day).reduce((sum, j) => sum + (SERVICE_TYPES[j.serviceType]?.price || 0), 0)
  }

  const handleDrop = (techId, hour, day) => {
    const jobId = dragOverSlot?.jobId
    if (!jobId) return
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j, techId, startTime: `${String(hour).padStart(2, '0')}:00`, date: format(day || selectedDate, 'yyyy-MM-dd'), status: 'scheduled'
    } : j))
    setDragOverSlot(null)
  }

  const handleNewJob = (job) => setJobs(prev => [...prev, job])
  const handleUpdateJob = (updated) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
    setSelectedJob(updated)
  }

  // KPI calculations
  const totalRevenue = todayJobs.reduce((sum, j) => sum + (SERVICE_TYPES[j.serviceType]?.price || 0), 0)
  const completedJobs = todayJobs.filter(j => j.status === 'completed').length
  const inProgressJobs = todayJobs.filter(j => j.status === 'in-progress').length

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* TOP HEADER */}
      <header className="bg-navy text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-dojo-600 rounded-lg flex items-center justify-center font-bold text-sm">🥋</div>
          <div>
            <h1 className="font-bold text-base">Field Service Command Center</h1>
            <p className="text-xs text-gray-400">The Dojo — Dryer Vent Services</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search jobs..." className="bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-400 w-64 focus:bg-white/20 focus:outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button className="relative p-2 hover:bg-white/10 rounded-lg"><Bell size={18} /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
          <button className="p-2 hover:bg-white/10 rounded-lg"><Settings size={18} /></button>
        </div>
      </header>

      {/* KPI BAR */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => setSelectedDate(d => addDays(d, -1))}><ChevronLeft size={18} /></button>
            <button className="font-semibold text-sm px-3 py-1 rounded-lg hover:bg-gray-100" onClick={() => setSelectedDate(new Date())}>{format(selectedDate, 'EEE, MMM d, yyyy')}</button>
            <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => setSelectedDate(d => addDays(d, 1))}><ChevronRight size={18} /></button>
            <button className="text-xs text-dojo-600 font-medium hover:underline ml-1" onClick={() => setSelectedDate(new Date())}>Today</button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {[{v: 'day', icon: LayoutGrid, l: 'Day'}, {v: 'week', icon: Calendar, l: 'Week'}, {v: 'list', icon: List, l: 'List'}].map(({v, icon: Icon, l}) => (
              <button key={v} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setView(v)}>
                <Icon size={14} />{l}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">${totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Today's Revenue</div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-lg font-bold">{todayJobs.length}</div>
            <div className="text-xs text-gray-400">Total Jobs</div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-500">{inProgressJobs}</div>
            <div className="text-xs text-gray-400">In Progress</div>
          </div>
          <div className="w-px h-8 bg-gray-200"></div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">{completedJobs}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
          <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowNewJob(true)}>
            <Plus size={16} /> New Job
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* Unassigned Queue */}
        <UnassignedQueue jobs={unassigned} onDragStart={(id) => setDragOverSlot({ jobId: id })} onJobClick={setSelectedJob} />

        {/* Dispatch Board */}
        <div className="flex-1 overflow-auto">
          {view === 'day' && (
            <div className="flex h-full">
              {/* Time Labels */}
              <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200 pt-[57px]">
                {HOURS.map(h => (
                  <div key={h} className="h-[80px] flex items-start justify-end pr-2 text-xs text-gray-400 font-medium">
                    {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                  </div>
                ))}
              </div>

              {/* Tech Columns */}
              {TECHNICIANS.map(tech => {
                const techJobs = getJobsForTechAndDay(tech.id, selectedDate)
                const revenue = getTechRevenue(tech.id, selectedDate)
                return (
                  <div key={tech.id} className="tech-column flex flex-col">
                    <TechHeader tech={tech} jobCount={techJobs.length} totalRevenue={revenue} />
                    <div className="flex-1 relative">
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="time-slot h-[80px]"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(tech.id, hour, selectedDate)}
                        >
                          {techJobs.filter(j => {
                            if (!j.startTime) return false
                            const jobHour = parseInt(j.startTime.split(':')[0])
                            return jobHour === hour
                          }).map(job => (
                            <div key={job.id} className="absolute inset-x-1 z-10" style={{ top: '2px' }}>
                              <JobCard job={job} compact onDragStart={(id) => setDragOverSlot({ jobId: id })} onJobClick={setSelectedJob} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {view === 'list' && (
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 font-semibold text-gray-500">Status</th>
                    <th className="pb-3 font-semibold text-gray-500">Customer</th>
                    <th className="pb-3 font-semibold text-gray-500">Service</th>
                    <th className="pb-3 font-semibold text-gray-500">Address</th>
                    <th className="pb-3 font-semibold text-gray-500">Technician</th>
                    <th className="pb-3 font-semibold text-gray-500">Time</th>
                    <th className="pb-3 font-semibold text-gray-500 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {todayJobs.map(job => {
                    const service = SERVICE_TYPES[job.serviceType]
                    const status = JOB_STATUSES[job.status]
                    const tech = TECHNICIANS.find(t => t.id === job.techId)
                    return (
                      <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedJob(job)}>
                        <td className="py-3"><span className={`badge ${status.color}`}>{status.label}</span></td>
                        <td className="py-3 font-medium">{job.customerName}</td>
                        <td className="py-3">{service?.icon} {service?.label}</td>
                        <td className="py-3 text-gray-500">{job.address}, {job.city}</td>
                        <td className="py-3">{tech ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: tech.color}}></span>{tech.name}</span> : <span className="text-gray-400">Unassigned</span>}</td>
                        <td className="py-3">{job.startTime || '—'}</td>
                        <td className="py-3 text-right font-semibold text-green-600">${service?.price}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {view === 'week' && (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd')
                  const dayJobs = jobs.filter(j => j.date === dayStr && j.techId)
                  const isToday = isSameDay(day, new Date())
                  return (
                    <div key={dayStr} className={`rounded-lg border ${isToday ? 'border-dojo-500 bg-dojo-50/30' : 'border-gray-200'}`}>
                      <div className={`text-center py-2 text-sm font-semibold border-b ${isToday ? 'bg-dojo-500 text-white rounded-t-lg' : 'bg-gray-50 text-gray-700'}`}>
                        {format(day, 'EEE d')}
                      </div>
                      <div className="p-2 space-y-1 min-h-[200px]">
                        {dayJobs.map(job => (
                          <div key={job.id} className="text-xs p-1.5 rounded bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100" onClick={() => { setSelectedDate(day); setSelectedJob(job) }}>
                            <div className="font-medium truncate">{job.customerName}</div>
                            <div className="text-gray-400">{job.startTime} · {SERVICE_TYPES[job.serviceType]?.label}</div>
                          </div>
                        ))}
                        {dayJobs.length === 0 && <div className="text-xs text-gray-300 text-center py-4">No jobs</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewJobModal isOpen={showNewJob} onClose={() => setShowNewJob(false)} onSave={handleNewJob} techs={TECHNICIANS} selectedDate={selectedDate} />
      <JobDetailModal job={selectedJob} isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} onUpdate={handleUpdateJob} techs={TECHNICIANS} />
    </div>
  )
}
