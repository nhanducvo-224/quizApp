Push-Location "c:\Users\FPT Shop\Documents\AppDemo1"
try {
    & npx tsc --noEmit --skipLibCheck 2>&1
} finally {
    Pop-Location
}
