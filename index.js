alert('rerun if terain not showing correctly')
"use strict"
// module aliases
let Engine = Matter.Engine,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Composite = Matter.Composite

let engine = Engine.create();
engine.world.gravity.x = -1
engine.world.gravity.y = 0

let runner = Runner.create();
Runner.run(runner, engine);

let terrain
let speed = .003
let acceleration = false
let deacceleration = false
let chunkSize = window.innerHeight
let xOff = 0
let xOffInc = 0.001
let e = .7
let carWidth = 50
let carHeight = 200
let headSize = 30
let score = 0

class wheel {
    constructor(yOffset, rect) {
        let xOffset = 35
        this.r = 30
        this.y = rect.position.y + yOffset
        this.x = rect.position.x - this.r - xOffset
        this.body = Bodies.circle(this.x, this.y, this.r, {
            restitution: 0,
            mass: 3,
        })
        let a = Matter.Constraint.create({
            bodyA: rect,
            pointA: { x: 0, y: yOffset + 30 },
            bodyB: this.body,
            stiffness: .7

        })
        let b = Matter.Constraint.create({
            bodyA: rect,
            pointA: { x: 0, y: yOffset - 30 },
            bodyB: this.body,
            stiffness: .7,
        })
        Composite.add(engine.world, this.body)
        Composite.add(engine.world, a)
        Composite.add(engine.world, b)
    }
    draw() {
        fill('#585959')
        circle(this.body.position.x, this.body.position.y, this.r)
    }
    move() {
        if (acceleration) {
            Matter.Body.setAngularVelocity(this.body, .5)
            Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: speed })
        }
        else if (deacceleration) {
            Matter.Body.setAngularVelocity(this.body, -.5)
            Matter.Body.applyForce(this.body, this.body.position, { x: 0, y: -speed })
        }
    }
}

let car = Bodies.rectangle(300, chunkSize * 2.5, carWidth, carHeight, { chamfer: true })
let head = Bodies.circle(300 + 50, chunkSize * 2.5, headSize)
let neck = Matter.Constraint.create({
    bodyA: head,
    pointA: { x: -headSize, y: 0 },
    bodyB: car,
    stiffness: 1,
    length: 25
})

Composite.add(engine.world, head)
Composite.add(engine.world, car)
Composite.add(engine.world, neck)

let w1 = new wheel(-70, car)
let w2 = new wheel(70, car)

function createBox(a, b, height) {
    const center = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    }
    let width = dist(a.x, a.y, b.x, b.y)
    let angle = Math.atan2(b.y - center.y, b.x - center.x)
    let box = Bodies.rectangle(center.x, center.y, width, 5, {
        isStatic: true,
        angle: angle,
        friction: 1,
        restitution: 0,
    })
    return box
}


class Chunk {
    constructor(index, otherChunks) {
        this.otherChunks = otherChunks
        this.prevChunk = otherChunks[index - 1] || null
        this.startY = this.prevChunk?.endY || 0
        this.endY = this.startY + chunkSize
        this.points = []
        this.filteredPoints = []
        this.boxes = []
        this.init()
    }
    get index() {
        return this.otherChunks.indexOf(this)
    }
    genratePoint() {
        for (let i = this.startY; i < this.endY; i++) {
            let x = noise(xOff) * innerWidth / 2
            this.points.push({ x: x, y: i })
            xOff += xOffInc
        }
    }
    genrateBoxes() {
        for (let i = 0; i < this.filteredPoints.length - 1; i++) {
            this.boxes.push(createBox(this.filteredPoints[i], this.filteredPoints[i + 1]))
        }
    }
    draw() {
        fill('green')
        beginShape()
        vertex(-width / 2, this.startY)
        this.filteredPoints.forEach(p => vertex(p.x, p.y))
        vertex(-width / 2, this.endY)
        endShape()
        fill('#644F36')
        beginShape()
        vertex(-width / 2, this.startY)
        this.filteredPoints.forEach(p => vertex(p.x - 30, p.y))
        vertex(-width / 2, this.endY)
        endShape()
    }
    init() {
        this.genratePoint()
        this.filteredPoints = simplify(this.points, e)
        this.genrateBoxes()
        Composite.add(engine.world, this.boxes)
    }
    onDelete() {
        this.boxes.forEach(box => Composite.remove(engine.world, box))
    }
}
class Terrain {
    constructor() {
        this.chunks = []
        for (let i = 0; i < 5; i++) this.createChunk(i)
    }
    updateCarChunk() {
        this.chunks.forEach(chunk => {
            if (car.position.y > chunk.startY && car.position.y < chunk.endY) {
                this.carChunk = chunk
                return
            }
        })
        return this.carChunk
    }
    deleteChunk(index) {
        this.chunks[index].onDelete()
        this.chunks.splice(index, 1)
    }
    createChunk(index) {
        this.chunks.push(new Chunk(index, this.chunks, chunkSize))
    }
    draw() {
        this.chunks.forEach(chunk => chunk.draw())
    }
    update() {
        this.updateCarChunk()
        if (this.carChunk.index == 3) {
            this.deleteChunk(0)
            this.createChunk(4)
        }

        this.carChunk.boxes.forEach((box) => {
            if (Matter.Collision.collides(head, box)?.collided) {
                Composite.remove(engine.world, neck)
                acceleration = false
                deacceleration = false
            }
        })
    }
}


function touchEnded() {
    deacceleration = false
    acceleration = false
    select('#gas').style('transform', '')
    select('#breaks').style('transform', '')
}

function touchStarted(e) {
    if (touches[0]?.y < innerHeight / 2) {
        deacceleration = true
        select('#breaks').style('transform', 'rotateZ(90deg) rotateX(45deg) ')
    } else {
        acceleration = true
        select('#gas').style('transform', ' rotateZ(90deg) rotateX(45deg)  ')
    }
}

function setup() {
    createCanvas(innerWidth, innerHeight)
    noiseDetail(4)
    terrain = new Terrain()
    rectMode(CENTER)
    ellipseMode(RADIUS)
    textSize(50)
    noStroke()
}

function draw() {
    background(0, 255, 255)

    translate(-car.position.x + width / 2, -car.position.y + height / 2)
    terrain.update()
    fill(255, 0, 0)
    push()
    translate(car.position.x, car.position.y)
    rotate(car.angle)
    rect(0, 0, carWidth, carHeight)
    pop()
    fill('#B8A597')
    circle(head.position.x, head.position.y, headSize)
    w1.move();
    w2.move();
    w1.draw()
    w2.draw()
    terrain.draw()
    push()
    fill(0)
    translate(car.position.x + width / 3, car.position.y)
    rotate(radians(90))
    text(score, 0, 0)
    pop()
    score = floor(car.position.y / 100)
    xOffInc = map(score, 0, 100, .001, .01)
}
