import sys, time
from Xlib import X, display
from Xlib.ext import xtest
d = display.Display(':99')
x, y = int(sys.argv[1]), int(sys.argv[2])
xtest.fake_input(d, X.MotionNotify, x=x, y=y)
d.sync()
time.sleep(0.2)
xtest.fake_input(d, X.ButtonPress, 1)
d.sync()
time.sleep(0.15)
xtest.fake_input(d, X.ButtonRelease, 1)
d.sync()
# Park the pointer in the far corner so no simulator button tooltip
# can hover into the recorded frame (a parked tooltip burned into the
# 24 Nov draft frames at the bottom of the display).
time.sleep(0.1)
xtest.fake_input(d, X.MotionNotify, x=8, y=8)
d.sync()
print('clicked', x, y)
