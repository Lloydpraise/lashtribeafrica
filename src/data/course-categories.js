// The three course categories the Academy dashboard is organised by. The admin picks one per
// course (Admin → Courses → course → Category); students see the courses grouped under them.
// The list is fixed on purpose. To add a category, add it here AND to the check constraint in
// supabase/migrations/0018_course_categories.sql.

export const COURSE_CATEGORIES = [
  { value: "beginner", label: "Beginner" },
  { value: "advanced", label: "Advanced" },
  { value: "business", label: "Business development" },
];

export const CATEGORY_VALUES = COURSE_CATEGORIES.map((c) => c.value);

/** Used for courses saved before categories existed: the old "level" decides. */
export function categoryFromLevel(level) {
  return !level || level === "beginner" ? "beginner" : "advanced";
}

/** The category a course row belongs to (its own, or one worked out from its level). */
export function courseCategory(row) {
  return CATEGORY_VALUES.includes(row?.category) ? row.category : categoryFromLevel(row?.level);
}

export function categoryLabel(value) {
  return COURSE_CATEGORIES.find((c) => c.value === value)?.label || "Beginner";
}
