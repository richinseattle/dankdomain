#!/bin/sh

[ -n "$1" ] && TARGET="$1" || TARGET=/usr/local/games
TARGET="${TARGET}/`basename ${PWD}`"

# let's prompt for admin credentials now, if necessary
sudo -v || exit

git pull
npm install
npm run build

sudo rsync -av --chown=root:games ./build/ ${TARGET}
sudo chown -R root.games ${TARGET}
sudo chmod -R u+rw,g+rw,o-rwx ${TARGET}
sudo find ${TARGET} -type d -exec chmod u+x,g+xs {} \;

echo ''
echo 'server files that exist that are not part of this build'
echo '                  ~~~~~          ~~~'
sudo rsync -anv --delete --exclude node_modules --exclude files ./build/ ${TARGET}

# xterm door service
sudo systemctl stop dankdomain-door
sudo systemctl start dankdomain-door

cd ${TARGET}
npm outdated
