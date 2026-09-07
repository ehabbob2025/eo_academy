import { useEffect, useMemo, useState } from 'react'
import { demoLessons } from '../data/demo'
import type { CourseLesson, StudentProfile } from '../types'

const LESSONS_KEY = 'eo-course-lessons'
const PROFILE_KEY = 'eo-course-profile'
const SOCIAL_KEY = 'eo-course-social-gate'
const PROJECT_KEY = 'eo-course-project-status'

export function useCourseState() {
  const [lessons, setLessons] = useState<CourseLesson[]>(() => {
    const saved = localStorage.getItem(LESSONS_KEY)
    return saved ? JSON.parse(saved) : demoLessons
  })
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem(PROFILE_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [socialGateDone, setSocialGateDone] = useState(
    () => localStorage.getItem(SOCIAL_KEY) === 'true',
  )
  const [projectStatus, setProjectStatus] = useState<'not_started' | 'submitted' | 'approved'>(
    () =>
      (localStorage.getItem(PROJECT_KEY) as 'not_started' | 'submitted' | 'approved') ||
      'not_started',
  )

  useEffect(() => localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons)), [lessons])
  useEffect(() => {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }, [profile])
  useEffect(() => localStorage.setItem(SOCIAL_KEY, String(socialGateDone)), [socialGateDone])
  useEffect(() => localStorage.setItem(PROJECT_KEY, projectStatus), [projectStatus])

  const completedCount = lessons.filter((lesson) => lesson.quizPassed).length
  const progress = Math.round((completedCount / lessons.length) * 100)
  const courseCompleted = completedCount === lessons.length

  const passLesson = (lessonId: string) => {
    setLessons((current) => {
      const passed = current.find((lesson) => lesson.id === lessonId)
      if (!passed) return current
      return current.map((lesson) => {
        if (lesson.id === lessonId) return { ...lesson, quizPassed: true, status: 'completed' }
        if (lesson.position === passed.position + 1) return { ...lesson, status: 'available' }
        return lesson
      })
    })
  }

  const updateLesson = (lessonId: string, changes: Partial<CourseLesson>) => {
    setLessons((current) =>
      current.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...changes } : lesson)),
    )
  }

  const resetDemo = () => {
    localStorage.removeItem(LESSONS_KEY)
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(SOCIAL_KEY)
    localStorage.removeItem(PROJECT_KEY)
    setLessons(demoLessons)
    setProfile(null)
    setSocialGateDone(false)
    setProjectStatus('not_started')
  }

  return useMemo(
    () => ({
      lessons,
      profile,
      setProfile,
      socialGateDone,
      setSocialGateDone,
      completedCount,
      progress,
      courseCompleted,
      passLesson,
      updateLesson,
      projectStatus,
      submitProject: () => setProjectStatus('submitted'),
      approveProject: () => setProjectStatus('approved'),
      resetDemo,
    }),
    [lessons, profile, socialGateDone, completedCount, progress, courseCompleted, projectStatus],
  )
}
