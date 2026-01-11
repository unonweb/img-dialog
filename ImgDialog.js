export default class ImgDialog extends HTMLElement {
	/* 
		@Attributes-CSS
			[data-state]		// on, off
			[data-transfx]		// flash, grey, blend, slide
		@Attributes-JS
			[data-src]			// siblings, children, <selector> (!)
			[data-modal]		// true, false
			[data-bullets]		// true, false
		@Fires
			img-selected
		@Parents
			<img-gallery>		// communicates the lastly selected img up
		@Children
			none
		Description
			This is an interactive image presenter using the <dialog> element.
			It is intended to be used as a additional subcomponent of e.g. <img-gallery>. 
			Copies the images from a given src selector.
			Has controls for left, right, close.
			May be used as modal (lightbox) or non-modal (slides).
			Must be closable as it is still a <dialog> element.
		Improve
			implement layzy loading
	*/

	static translate(key) {
		let lang = (document.documentElement.lang !== '') ? document.documentElement.lang : 'de'
		if (!this.dictionary[key]) {
			return 'undefined'
		}
		return this.dictionary[key][lang]
	}

	static dictionary = {
		'left': {
			de: 'Bild zurück',
			en: 'One image back'
		},
		'right': {
			de: 'Bild vorwärts',
			en: 'One image forward'
		},
		'close': {
			de: 'Lightbox Schließen',
			en: 'Close lightbox'
		},
	}

	_bulletsCreated = false
	_defaults = {
		src: 'siblings',
		state: 'closed',
		bullets: 'true',
		transfx: 'flash',
		modal: 'true',
	}
	_log = false

	_right
	_left
	_close
	_imgs
	_selectedIndex

	constructor() {
		super()
	}

	set selectedIndex(newIndex) {
		// sets this._selectedIndex

		if (typeof newIndex !== 'number') {
			newIndex = Number(newIndex)
		}

		let oldIndex = this.selectedIndex // returns this._selectedIndex as a number

		// checks
		if (newIndex > this._imgs.length - 1) return // return if beyond last item
		if (newIndex < 0) return // return if beyond first item

		// change
		if (typeof newIndex !== 'undefined') {
			this._selectedIndex = newIndex // update index
		}

		//if (this._log) console.log('oldIndex: ', oldIndex, 'newIndex: ', newIndex)

		this._updateClasses(oldIndex, newIndex)
	}

	get selectedIndex() {
		return Number(this._selectedIndex) // return a number
	}

	connectedCallback() {

		// init public
		this.dataset.src ??= this._defaults.src
		this.dataset.state ??= this._defaults.state
		this.dataset.bullets ??= this._defaults.bullets
		this.dataset.transfx ??= this._defaults.transfx
		this.dataset.modal ??= this._defaults.modal

		this._render()
		this._getRendered()
		if (this.dataset.bullets === 'true') {
			this._insertBullets()
		}
		if (this.dataset.state === 'open' && !this.selectedIndex) {
			this.selectedIndex = 0
		}
		this._addEventListeners()
	}

	_render() {
		if (this._log) console.log('render()', this._tagName)

		const html = /* html */`
			<dialog class="modal showcase" autofocus ${this.dataset.state === 'open' ? 'open' : ''}>
				<button title="close" aria-label="${ImgDialog.translate('close')}" class="close"></button>
				<button title="left" aria-label="${ImgDialog.translate('left')}" class="arrows left"></button>
				${this._renderImgHTML(this.dataset.src)}
				<button title="right" aria-label="${ImgDialog.translate('right')}" class="arrows right"></button>
			</dialog>`

		this.innerHTML = html
	}

	_renderImgHTML(selector) {
		if (!selector) return console.error('selector: ', selector)

		let imgs

		switch (selector) {
			case 'siblings':
				imgs = Array.from(this.parentElement.children).filter(child => child.tagName === 'IMG')
				break;
			case 'children':
				imgs = Array.from(this.querySelectorAll('img'))
				break
			default:
				imgs = this.querySelectorAll(selector)
				break;
		}


		if (imgs.length === 0) {
			return console.error('imgs: ', imgs)
		}
		let imgHTML = ''
		for (let img of imgs) {
			imgHTML += img.outerHTML
		}
		return imgHTML
	}

	_insertBullets() {
		let bullets = document.createElement('div')
		bullets.className = 'bullets'
		bullets.ariaHidden = true

		this._imgs.map((item, index) => {
			let button = document.createElement('button')
			button.classList.add('bullet')
			button.id = `bullet-${index}`
			button.dataset.index = index
			button.addEventListener('click', this._onClickBullet)
			bullets.append(button)
		})
		this._bulletsCreated = true
		this._dialog.append(bullets)
	}

	_getRendered() {
		this._imgs ??= Array.from(this.querySelectorAll('img'))
		this._close ??= this.querySelector('button.close')
		this._left ??= this.querySelector('button.left')
		this._right ??= this.querySelector('button.right')
		this._dialog ??= this.querySelector('dialog')
	}

	_addEventListeners() {
		// event listeners
		this._close.addEventListener('click', this._onClickClose)
		this._left.addEventListener('click', this._selectLeft)
		this._right.addEventListener('click', this._selectRight)
		this._dialog.addEventListener('keydown', this._onKeyDown)
	}

	_onKeyDown = (evt) => {
		if (this.contains(evt.target)) {
			evt.stopImmediatePropagation() // If several listeners are attached to the same element for the same event type, they are called in the order in which they were added. If stopImmediatePropagation() is invoked during one such call, no remaining listeners will be called, either on that element or any other element.
			switch (evt.key) {
				case 'Escape':
					this._onClickClose(evt)
					break;
				case 'ArrowLeft':
					this._selectLeft(evt)
					break;
				case 'ArrowRight':
					this._selectRight(evt)
					break;
				case 'Enter':
					this._onEnter(evt)
					break;
			}
		}
	}

	_onEnter = (evt) => {
		console.log(evt.target)
		if (evt.target === this._left || evt.target === this._right) {
			evt.stopPropagation()
		}
	}

	_onClickClose = (evt) => {
		if (this._log) console.log('_onClickClose()', 'this.selectedIndex: ', this.selectedIndex)

		this.dataset.state = 'closed'
		this._dialog.close()

		const event = new CustomEvent('img-selected', {
			bubbles: true,
			composed: true,
			detail: { index: this.selectedIndex }
		})
		this.dispatchEvent(event)

		this.selectedIndex = null // reset internal selected index
	}

	_onClickBullet = (evt) => {
		this.selectedIndex = Number(evt.target.dataset.index)
	}

	_selectLeft = () => {
		this.selectedIndex = this.selectedIndex - 1
	}

	_selectRight = (evt) => {
		this.selectedIndex = this.selectedIndex + 1
	}

	_updateClasses(oldIndex, newIndex) {
		// receives numbers
		if (Number.isInteger(oldIndex)) this._imgs[oldIndex].classList.remove('current')
		if (Number.isInteger(newIndex)) this._imgs[newIndex].classList.add('current')

		//if (this._log) console.log('img.current: ', this._imgs[newIndex])

		if (this._bulletsCreated) {
			if (Number.isInteger(oldIndex)) this.querySelector(`#bullet-${oldIndex}`).classList.remove('bullet-current')
			if (Number.isInteger(newIndex)) this.querySelector(`#bullet-${newIndex}`).classList.add('bullet-current')
		}
	}

	show(index) {
		//this._dialog.style.setProperty('width', img.naturalWidth + 'px');
		if (this._log) console.log('show()', index)
		this.dataset.state = 'open' // set modal state = open
		this.selectedIndex = index
		if (this.dataset.modal === 'true') {
			this._dialog.showModal()
		}
		else {
			this._dialog.show()
		}
	}
}