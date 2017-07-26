import gulp from 'gulp'
import mocha from 'gulp-mocha'

export default function mochaTask () {
  return gulp.src('tests/**/*.js', { read: false })
    .pipe(mocha({ compilers: 'js:babel-core/register' }))
}
