import gulp from 'gulp'
import eslint from './tasks/eslint'
import mocha from './tasks/mocha'

gulp.task('eslint', eslint)
gulp.task('mocha', mocha)
gulp.task('default', ['eslint', 'mocha'])
