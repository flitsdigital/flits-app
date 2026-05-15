import { useCallback, useEffect, useState } from 'react'
import { projectsDb } from '../lib/projectsDb'
import { useAuthStore } from '../store/useAuthStore'
import type { Project, Task, TaskStatus } from '../types'

export interface UserProfileLite {
  id: string
  email: string
  name?: string | null
  avatar_url?: string | null
}

export function useProjectsData() {
  const authReady = useAuthStore((s) => s.authReady)
  const sessionUserId = useAuthStore((s) => s.session?.user.id)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [profiles, setProfiles] = useState<UserProfileLite[]>([])
  const [loading, setLoading] = useState(true)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allTasksLoading, setAllTasksLoading] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [projData, taskData, profileData] = await Promise.all([
      projectsDb.fetchProjects(),
      projectsDb.fetchTaskRefs(),
      projectsDb.fetchProfilesBasic(),
    ])
    setProjects(projData)
    setProfiles(profileData)

    const counts: Record<string, number> = {}
    taskData.forEach((t) => {
      counts[t.projectId] = (counts[t.projectId] ?? 0) + 1
    })
    setTaskCounts(counts)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authReady || !sessionUserId) return
    loadAll()
  }, [loadAll, authReady, sessionUserId])

  async function loadProjectTasks(projectId: string) {
    const data = await projectsDb.fetchProjectTasks(projectId)
    setTasks(data)
  }

  async function loadAllTasks() {
    setAllTasksLoading(true)
    const data = await projectsDb.fetchAllTasks()
    setAllTasks(data)
    setAllTasksLoading(false)
  }

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    await projectsDb.updateTaskStatus(taskId, newStatus)
  }

  return {
    projects,
    setProjects,
    tasks,
    setTasks,
    taskCounts,
    setTaskCounts,
    profiles,
    loading,
    allTasks,
    setAllTasks,
    allTasksLoading,
    loadAll,
    loadProjectTasks,
    loadAllTasks,
    updateTaskStatus,
  }
}
