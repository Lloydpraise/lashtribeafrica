"""Installs the security hardening + verified completion + final exam changes into a Lashtribe checkout.
Usage: python3 install.py <project root>      (run from anywhere; this folder holds the new files)
Safe to run once. Nothing is overwritten blindly: edits are exact text replacements that stop if the
file has changed, and Assessment.jsx is only replaced when it is the version this was written against."""
import sys, pathlib, shutil, subprocess, hashlib

here = pathlib.Path(__file__).resolve().parent
root = pathlib.Path(sys.argv[1]).resolve()
problems = []

def copy(rel, expect_md5=None):
    src, dst = here / "files" / rel, root / rel
    if dst.exists() and expect_md5 and hashlib.md5(dst.read_bytes()).hexdigest() != expect_md5:
        shutil.copyfile(src, dst.with_name(dst.name + ".new"))
        problems.append(f"{rel} has local changes: the new version was saved next to it as {dst.name}.new")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    print(f"{rel}: written")

# 1. migrations and brand-new files
for m in ["0026_security_hardening.sql", "0027_verified_course_completion.sql", "0028_course_exams.sql"]:
    copy(f"supabase/migrations/{m}")
for rel in ["src/components/learn/Exam.jsx", "src/admin/sections/courses/ExamEditor.jsx", "src/admin/sections/courses/ExamReview.jsx"]:
    copy(rel)
copy("src/components/learn/Assessment.jsx", expect_md5="d07ee17f28eb53bfc895c15422de06e9")

# 2. edits to existing files
for patch in ["academy_patch.py", "learnapp_patch.py", "admin_patch.py", "customers_patch.py"]:
    r = subprocess.run([sys.executable, "-I", str(here / "patches" / patch), str(root)])
    if r.returncode: problems.append(f"{patch} could not apply every change (see above)")

# 3. styles (appended once)
for rel, marker in [("src/styles/learn.css", "/* final exam (Exam.jsx) */"), ("src/admin/admin.css", "/* final exam editor + marking")]:
    p = root / rel
    s = p.read_text(encoding="utf-8")
    if marker in s: print(f"{rel}: styles already there"); continue
    p.write_text(s.rstrip("\n") + "\n\n" + (here / "css" / (pathlib.Path(rel).stem + ".append.css")).read_text(encoding="utf-8"), encoding="utf-8")
    print(f"{rel}: styles added")

# 4. 0018 (not run yet on the live database) no longer lets signed-out visitors call admin_save_course
p = root / "supabase/migrations/0018_course_categories.sql"
s = p.read_text(encoding="utf-8")
old = "grant execute on function public.admin_save_course(jsonb) to anon, authenticated;"
if old in s:
    p.write_text(s.replace(old, "revoke all on function public.admin_save_course(jsonb) from anon;\n"
                 "grant execute on function public.admin_save_course(jsonb) to authenticated;  -- signed-in admins only (see 0026)"), encoding="utf-8")
    print("supabase/migrations/0018_course_categories.sql: admin_save_course no longer granted to anon")

# 5. migrations README
p = root / "supabase/migrations/README.md"
s = p.read_text(encoding="utf-8")
if "0026_security_hardening.sql" not in s:
    p.write_text(s.rstrip("\n") + "\n" + (here / "README.append.md").read_text(encoding="utf-8"), encoding="utf-8")
    print("supabase/migrations/README.md: 0026-0028 described")

print("\nDone." if not problems else "\nDone, with things to look at:\n- " + "\n- ".join(problems))
