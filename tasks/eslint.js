import gulp from 'gulp'
import eslint from 'gulp-eslint'

export default function eslintTask () {
  return gulp.src(['src/**/*.js', 'tests/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
}
