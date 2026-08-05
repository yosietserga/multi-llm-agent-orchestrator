import { NextResponse } from 'next/server'
import { SKILLS, SKILL_CATEGORIES, SKILL_COUNT, INVOKABLE_SKILLS, skillsByCategory } from '@/lib/agents/skills'

/** GET /api/skills — the 100-skill registry. */
export async function GET() {
  return NextResponse.json({
    count: SKILL_COUNT,
    invokableCount: INVOKABLE_SKILLS.length,
    categories: SKILL_CATEGORIES,
    byCategory: skillsByCategory(),
    skills: SKILLS,
  })
}
