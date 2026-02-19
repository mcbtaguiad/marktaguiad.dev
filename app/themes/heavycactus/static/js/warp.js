let sky, center

function dot(i) {
   const size = Math.round(Math.random() + 1)
   const root = document.createElement('span')

   root.style.top = center.y + 'px'
   root.style.left = center.x + 'px'

   // randomize starting opacity timing so we don’t get a blank frame
   root.style.animationDelay = `${Math.random() * -30}s, ${Math.random() * -30}s`

   root.classList.add('star', `size-${size}`, `axis-${i}`)
   return root
}

function clear() {
   sky.innerHTML = ''
}

function init() {
   sky = document.querySelector('#sky')
   if (!sky) return

   center = {
      x: sky.clientWidth / 2,
      y: sky.clientHeight / 2,
   }

   clear()

   const frag = document.createDocumentFragment()
   for (let i = 0; i < 360; i++) {
      frag.appendChild(dot(i))
   }
   sky.appendChild(frag)
}

window.addEventListener('load', init)
window.addEventListener('resize', init)