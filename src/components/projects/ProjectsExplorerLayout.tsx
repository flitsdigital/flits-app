import { NavigateFunction } from 'react-router-dom'
import { Plus, List, CalendarRange, Folder, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import type { UserProfileLite } from '../../hooks/useProjectsData'
import type { Client, Project, Task } from '../../types'
import { usePermissions } from '../../hooks/usePermissions'
import { PageHeader } from '../PageHeader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/select'
import { ProjectsTimeline } from './ProjectsTimeline'
import { AllTasksView } from './AllTasksView'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'
import { TaskModal } from './TaskModal'

export interface ClientWithCount extends Client {
  count: number
}

export interface ProjectsExplorerLayoutProps {
  leftNav: 'projects' | 'overview' | 'timeline'
  setLeftNav: (v: 'projects' | 'overview' | 'timeline') => void
  selectedClientId: string | null
  setSelectedClientId: (v: string | null) => void
  clients: Client[]
  clientsWithProjects: ClientWithCount[]
  internProjectCount: number
  projects: Project[]
  filteredProjects: Project[]
  taskCounts: Record<string, number>
  loading: boolean
  allTasks: Task[]
  allTasksLoading: boolean
  profiles: UserProfileLite[]
  profileId: string | undefined
  showProjectModal: boolean
  editProject: Project | undefined
  showTaskModal: boolean
  editTask: Task | undefined
  navigate: NavigateFunction
  openOverview: () => void
  openProject: (p: Project) => void
  setEditProject: (p: Project | undefined) => void
  setShowProjectModal: (v: boolean) => void
  setShowTaskModal: (v: boolean) => void
  setEditTask: (t: Task | undefined) => void
  handleProjectSaved: (p: Project) => void
  handleProjectDeleted: (id: string) => void
  handleTaskSaved: (t: Task) => void
  handleTaskDeleted: (id: string) => void
  setAllTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function ProjectsExplorerLayout({
  leftNav,
  setLeftNav,
  selectedClientId,
  setSelectedClientId,
  clients,
  clientsWithProjects,
  internProjectCount,
  projects,
  filteredProjects,
  taskCounts,
  loading,
  allTasks,
  allTasksLoading,
  profiles,
  profileId,
  showProjectModal,
  editProject,
  showTaskModal,
  editTask,
  navigate,
  openOverview,
  openProject,
  setEditProject,
  setShowProjectModal,
  setShowTaskModal,
  setEditTask,
  handleProjectSaved,
  handleProjectDeleted,
  handleTaskSaved,
  handleTaskDeleted,
  setAllTasks,
}: ProjectsExplorerLayoutProps) {
  const { can } = usePermissions()

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="lg:hidden border-b border-border-subtle px-4 py-3 flex items-center gap-2">
        <Select
          value={leftNav === 'overview' ? '__overview__' : leftNav === 'timeline' ? '__timeline__' : selectedClientId ?? '__all__'}
          onValueChange={(v) => {
            if (v === '__overview__') {
              openOverview()
            } else if (v === '__timeline__') {
              setLeftNav('timeline')
            } else if (v === '__all__') {
              setLeftNav('projects')
              setSelectedClientId(null)
            } else {
              setLeftNav('projects')
              setSelectedClientId(v)
            }
          }}
        >
          <SelectTrigger className="h-9 text-sm flex-1">
            <span>
              {leftNav === 'overview'
                ? 'Alle taken'
                : selectedClientId
                  ? clients.find((c) => c.id === selectedClientId)?.companyName ?? 'Onbekend'
                  : `Alle klanten (${projects.length})`}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__overview__">Alle taken</SelectItem>
              <SelectItem value="__timeline__">Tijdlijn</SelectItem>
              <SelectItem value="__all__">Alle klanten ({projects.length})</SelectItem>
              {clientsWithProjects.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.companyName} ({c.count})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <aside className="w-52 shrink-0 border-r border-border-subtle hidden lg:flex flex-col">
        <div className="px-2 pt-3 pb-2 border-b border-border-subtle space-y-0.5">
          <button
            onClick={openOverview}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              leftNav === 'overview' ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            <List size={14} strokeWidth={1.8} />
            Alle taken
          </button>
          <button
            onClick={() => setLeftNav('timeline')}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
              leftNav === 'timeline' ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            <CalendarRange size={14} strokeWidth={1.8} />
            Tijdlijn
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-border-subtle">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Projecten</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <button
            onClick={() => {
              setLeftNav('projects')
              setSelectedClientId(null)
            }}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
              leftNav === 'projects' && !selectedClientId ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
            )}
          >
            <span>Alle klanten</span>
            <span className="text-xs text-text-muted">{projects.length}</span>
          </button>
          {clientsWithProjects.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setLeftNav('projects')
                setSelectedClientId(c.id)
              }}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                leftNav === 'projects' && selectedClientId === c.id ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )}
            >
              <span className="truncate text-left">{c.companyName}</span>
              <span className="text-xs text-text-muted ml-2 shrink-0">{c.count}</span>
            </button>
          ))}
          {internProjectCount > 0 && (
            <button
              onClick={() => {
                setLeftNav('projects')
                setSelectedClientId('__no_client__')
              }}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                leftNav === 'projects' && selectedClientId === '__no_client__' ? 'bg-white/[0.07] text-text-primary font-medium' : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
              )}
            >
              <span className="truncate text-left text-text-muted italic">Intern</span>
              <span className="text-xs text-text-muted ml-2 shrink-0">{internProjectCount}</span>
            </button>
          )}
        </nav>
      </aside>

      <main className={clsx('flex-1', leftNav === 'timeline' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto')}>
        {leftNav === 'overview' ? (
          <>
            <PageHeader title="Alle taken" subtitle={`${allTasks.length} taken over ${projects.length} projecten`} />
            <div className="p-4 lg:p-5">
              {allTasksLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AllTasksView
                  tasks={allTasks}
                  projects={projects}
                  clients={clients}
                  profiles={profiles}
                  currentUserId={profileId}
                  onTaskClick={(task) => navigate(`/projecten/${task.projectId}/taken/${task.id}`)}
                />
              )}
            </div>
          </>
        ) : leftNav === 'timeline' ? (
          <>
            <PageHeader title="Tijdlijn" subtitle={`${projects.filter((p) => p.status !== 'completed').length} actieve projecten`} />
            <div className="flex-1 overflow-hidden">
              <ProjectsTimeline projects={projects} clients={clients} onProjectClick={openProject} />
            </div>
          </>
        ) : (
          <>
            <PageHeader
              title={
                selectedClientId === '__no_client__'
                  ? 'Intern'
                  : selectedClientId
                    ? clients.find((c) => c.id === selectedClientId)?.companyName ?? 'Projecten'
                    : 'Projecten'
              }
              subtitle={`${filteredProjects.length} projecten`}
              actions={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditProject(undefined)
                    setShowProjectModal(true)
                  }}
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Nieuw project</span>
                  <span className="sm:hidden">Nieuw</span>
                </Button>
              }
            />

            <div className="p-4 lg:p-6">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-border-subtle flex items-center justify-center mb-4">
                    <Folder size={20} className="text-text-muted" />
                  </div>
                  <p className="text-sm text-text-secondary font-medium mb-1">Geen projecten</p>
                  <p className="text-xs text-text-muted">Maak een nieuw project aan om te beginnen</p>
                </div>
              ) : (
                <>
                  {/* Waarde-overzicht balk — alleen zichtbaar als er projecten met waarde zijn */}
                  {can('financials') && (() => {
                    const withValue = filteredProjects.filter((p) => p.value != null && p.value > 0)
                    if (withValue.length === 0) return null

                    const fmt = (n: number) =>
                      `€${n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

                    const totalValue = withValue.reduce((sum, p) => sum + (p.value ?? 0), 0)
                    const totalInvoiced = withValue.reduce((sum, p) => sum + Math.min(p.invoicedAmount ?? 0, p.value ?? 0), 0)
                    const totalOpen = totalValue - totalInvoiced

                    // Nog te factureren op actieve/gepauzeerde projecten
                    const activeOpen = withValue
                      .filter((p) => p.status !== 'completed')
                      .reduce((sum, p) => {
                        const inv = Math.min(p.invoicedAmount ?? 0, p.value ?? 0)
                        return sum + ((p.value ?? 0) - inv)
                      }, 0)

                    const totalPct = totalValue > 0 ? Math.round((totalInvoiced / totalValue) * 100) : 0

                    return (
                      <div className="flex flex-wrap gap-3 mb-5">
                        {/* Nog te factureren */}
                        <div className="flex items-center gap-2.5 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2.5 shadow-card">
                          <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                            <TrendingUp size={13} className="text-amber-400/80" />
                          </div>
                          <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Nog te factureren</p>
                            <p className="text-sm font-semibold text-text-primary tabular-nums">{fmt(activeOpen)}</p>
                          </div>
                        </div>

                        {/* Gefactureerd */}
                        {totalInvoiced > 0 && (
                          <div className="flex items-center gap-2.5 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2.5 shadow-card">
                            <div className="w-7 h-7 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
                              <TrendingUp size={13} className="text-green-400/80" />
                            </div>
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Gefactureerd</p>
                              <p className="text-sm font-semibold text-text-primary tabular-nums">{fmt(totalInvoiced)}</p>
                            </div>
                          </div>
                        )}

                        {/* Totaal + progress */}
                        <div className="flex items-center gap-3 bg-surface-card border border-border-subtle rounded-lg px-3.5 py-2.5 shadow-card min-w-[160px]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">Totaal</p>
                              <p className="text-[10px] text-text-muted tabular-nums">{totalPct}%</p>
                            </div>
                            <div className="w-full h-1 rounded-full bg-surface-3 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green-500/60 transition-all"
                                style={{ width: `${totalPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-text-disabled mt-1 tabular-nums">{fmt(totalInvoiced)} / {fmt(totalValue)}</p>
                          </div>
                        </div>

                        {withValue.length < filteredProjects.length && (
                          <div className="flex items-center self-center">
                            <span className="text-[10px] text-text-disabled">
                              {withValue.length}/{filteredProjects.length} projecten met waarde
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      clientName={project.clientId ? clients.find((c) => c.id === project.clientId)?.companyName ?? '—' : 'Intern'}
                      taskCount={taskCounts[project.id] ?? 0}
                      onClick={() => openProject(project)}
                      onEdit={() => {
                        setEditProject(project)
                        setShowProjectModal(true)
                      }}
                    />
                  ))}
                </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {showProjectModal && (
        <ProjectModal
          project={editProject}
          clientId={selectedClientId ?? undefined}
          onClose={() => {
            setShowProjectModal(false)
            setEditProject(undefined)
          }}
          onSaved={handleProjectSaved}
          onDeleted={handleProjectDeleted}
        />
      )}
      {showTaskModal && editTask && (
        <TaskModal
          task={editTask}
          projectId={editTask.projectId}
          profiles={profiles}
          onClose={() => {
            setShowTaskModal(false)
            setEditTask(undefined)
          }}
          onSaved={(t) => {
            setAllTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))
            handleTaskSaved(t)
          }}
          onDeleted={(id) => {
            setAllTasks((prev) => prev.filter((x) => x.id !== id))
            handleTaskDeleted(id)
          }}
        />
      )}
    </div>
  )
}
