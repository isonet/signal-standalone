const gulp = require('gulp');
const shell = require('gulp-shell');
const NwBuilder = require('nw-builder');
const del = require('del');
const exec = require('child_process').exec;
const zip = require('gulp-zip');

let currentVersion;

gulp.task('clean', shell.task(['rm -Rf ./build']));

gulp.task('init', shell.task(['mkdir ./build', 'mkdir ./build/extension', 'mkdir ./build/dist', 'cp ./signal-package.json ./build/extension/package.json']));

gulp.task('clone-signal', shell.task(['git clone https://github.com/WhisperSystems/Signal-Desktop.git src'], {cwd: './build/'}));

gulp.task('checkout-signal-latest', (done) => {
    exec('git describe --abbrev=0 --tags', {cwd: './build/src/'}, function (err, stdout) {
        if (err) {
            return done(err);
        }
        currentVersion = stdout.trim();
        console.log(`Signal Desktop Current Version: ${currentVersion}`);
        shell.task([`git checkout ${currentVersion}`], {cwd: './build/src/'});
        return done();
    });
});

gulp.task('build-signal', shell.task(['npm install', 'LANG=en_US.UTF-8 ./node_modules/grunt-cli/bin/grunt', 'mv dist/* ../extension/'], {cwd: './build/src/'}));

gulp.task('build-nw', (done) => {
    const nw = new NwBuilder({
        files: './build/extension/**/**', // use the glob format
        platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
        zip: false,
        buildDir: './build/dist',
        flavor: 'normal',
        appVersion: currentVersion,
        appName: `signal-standalone-${currentVersion}`
    });

    nw.on('log', console.log);

    nw.build().then(() => {
        del('./build/dist/**/**/package.json').then((paths) => {
            console.log('Deleted files and folders:\n', paths.join('\n'));
            done();
        });
    }).catch((error) => {
        done(new Error(error));
    });
});

gulp.task('build-release-linux32', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/linux32/**/**`).pipe(zip(`linux32-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/')));

gulp.task('build-release-linux64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/linux64/**/**`).pipe(zip(`linux64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/')));

gulp.task('build-release-osx64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/osx64/**/**`).pipe(zip(`osx64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/')));

gulp.task('build-release-win32', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/win32/**/**`).pipe(zip(`win32-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/')));

gulp.task('build-release-win64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/win64/**/**`).pipe(zip(`win64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/')));

gulp.task('build-release', gulp.parallel('build-release-linux32', 'build-release-linux64', 'build-release-osx64', 'build-release-win32', 'build-release-win64'));


gulp.task('default', gulp.series('clean', 'init', 'clone-signal', 'checkout-signal-latest', 'build-signal', 'build-nw', 'build-release'));