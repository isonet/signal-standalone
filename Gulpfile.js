const gulp = require('gulp');
const shell = require('gulp-shell');
const NwBuilder = require('nw-builder');
const del = require('del');

gulp.task('clean', shell.task(['rm -Rf ./build']));

gulp.task('init', shell.task(['mkdir ./build', 'mkdir ./build/signal', 'mkdir ./build/dist', 'cp ./signal-package.json ./build/signal/package.json']));

gulp.task('clone-signal', shell.task(['cd ./build/ && git clone https://github.com/WhisperSystems/Signal-Desktop.git']));

gulp.task('checkout-signal-latest', shell.task(['cd ./build/Signal-Desktop/ && git checkout $(git describe --tags)']));

gulp.task('build-signal', shell.task(['cd ./build/Signal-Desktop/ && npm install && LANG=en_US.UTF-8 ./node_modules/grunt-cli/bin/grunt && mv dist/* ../signal/']));

gulp.task('build-nw', (done) => {
    const nw = new NwBuilder({
        files: './build/signal/**/**', // use the glob format
        platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
        zip: false,
        buildDir: './build/dist',
        flavor: 'normal'
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


gulp.task('default', gulp.series('clean', 'init', 'clone-signal', 'checkout-signal-latest', 'build-signal', 'build-nw'));