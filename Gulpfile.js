const gulp = require('gulp');
const shell = require('gulp-shell');
const NwBuilder = require('nw-builder');
const del = require('del');
const exec = require('child_process').exec;
const zip = require('gulp-zip');
const ghRelease = require('gh-release');
const icongen = require('icon-gen');
const Jimp = require("jimp");

let currentVersion;

gulp.task('clean', shell.task(['rm -Rf ./build']));

gulp.task('init', shell.task(['mkdir ./build', 'mkdir ./build/icons', 'mkdir ./build/extension', 'mkdir ./build/dist', 'cp ./signal-package.json ./build/extension/package.json']));

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

gulp.task('build-icons', () => {
    console.log(process.cwd());
    const res = [16, 24, 32, 48, 57, 64, 72, 96, 120, 128, 144, 152, 195, 228, 256, 512, 1024];
    const promises = [];
    res.forEach((r) => {
        promises.push(new Promise((resolve, reject) => Jimp.read("./build/extension/images/icon_256.png").then((image) => {
            image.resize(r, r).write(`./build/icons/${r}.png`, () => resolve())
        }).catch((err) => reject(err))));
    });
    return Promise.all(promises);
});

gulp.task('build-nw', (done) => {

    icongen('./build/icons/', './build/icons/', {
        type: 'png',
        report: true,
        modes: ['ico', 'icns'],
        names: {
            ico: 'signal',
            icns: 'signal'
        }
    }).then((results) => {
        console.log(results);
    }).catch((err) => {
        return done(err);
    });

    const nw = new NwBuilder({
        files: './build/extension/**/**', // use the glob format
        platforms: ['osx64', 'win32', 'win64', 'linux32', 'linux64'],
        zip: false,
        buildDir: './build/dist',
        flavor: 'normal',
        appVersion: currentVersion,
        appName: `signal-standalone-${currentVersion}`,
        winIco: './build/icons/signal.ico',
        macIcns: './build/icons/signal.icns'
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

gulp.task('build-release-linux32', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/linux32/**/**`).pipe(zip(`linux32-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/zip/')));

gulp.task('build-release-linux64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/linux64/**/**`).pipe(zip(`linux64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/zip/')));

gulp.task('build-release-osx64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/osx64/**/**`).pipe(zip(`osx64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/zip/')));

gulp.task('build-release-win32', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/win32/**/**`).pipe(zip(`win32-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/zip/')));

gulp.task('build-release-win64', () => gulp.src(`./build/dist/signal-standalone-${currentVersion}/win64/**/**`).pipe(zip(`win64-${currentVersion}.zip`)).pipe(gulp.dest('./build/dist/zip/')));

gulp.task('build-release', gulp.parallel('build-release-linux32', 'build-release-linux64', 'build-release-osx64', 'build-release-win32', 'build-release-win64'));

gulp.task('push-release', (done) => {
    if (typeof process.env.GITHUB_OAUTH_TOKEN === 'string' && process.env.GITHUB_OAUTH_TOKEN.length > 0) {
        const options = {
            tag_name: currentVersion.toString(),
            target_commitish: 'master',
            name: `signal-standalone-${currentVersion}`,
            body: `signal-standalone-${currentVersion}`,
            draft: false,
            prerelease: false,
            repo: 'signal-standalone',
            owner: 'isonet',
            endpoint: 'https://api.github.com',
            auth: {
                token: process.env.GITHUB_OAUTH_TOKEN
            },
            workpath: process.cwd(),
            assets: [
                `build/dist/zip/linux32-${currentVersion}.zip`,
                `build/dist/zip/linux64-${currentVersion}.zip`,
                `build/dist/zip/osx64-${currentVersion}.zip`,
                `build/dist/zip/win32-${currentVersion}.zip`,
                `build/dist/zip/win64-${currentVersion}.zip`
            ]
        };
        ghRelease(options, function (err, result) {
            if (err) {
                return done(err);
            }
            console.log(result)
        })
    } else {
        return done(new Error('No auth token found.'));
    }

});


gulp.task('default', gulp.series('clean', 'init', 'clone-signal', 'checkout-signal-latest', 'build-signal', 'build-icons', 'build-nw', 'build-release', 'push-release'));