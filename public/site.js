$(document).ready(function() {
  var canvas = $("#graph").get(0)
  var ctx = canvas.getContext("2d")
  var gfx = arbor.Graphics(canvas)

  var wordWrap = function (str, width, brk, cut) {
    brk = brk || '\n';
    width = width || 75;
    cut = cut || false;
 
    if (!str) { return str; }
 
    var regex = '.{1,' +width+ '}(\\s|$)' + (cut ? '|.{' +width+ '}|.+$' : '|\\S+?(\\s|$)');
 
    return str.match( RegExp(regex, 'g') ).join( brk );
  }

  var graphRenderer = {
    init: function(sys) {
      sys.screenSize(canvas.width, canvas.height)
      sys.screenPadding(80)
    },
    redraw: function() {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      sys.eachEdge(function(edge, pt1, pt2) {
        ctx.strokeStyle = "rgba(0,0,0,.333)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pt1.x, pt1.y)
        ctx.lineTo(pt2.x, pt2.y)
        ctx.stroke()
      })

      sys.eachNode(function(node, pt) {
        var color = "orange"

        text = node.name
        
        if (node.data.title !== undefined) {
          text = node.data.title
        }

        if (node.data.label !== undefined) {
          text += " " + node.data.label
        }

        text = wordWrap(text, 40).split("\n")

        maxWidth = 0
        for (var idx = 0 in text) {
          maxWidth = Math.max(maxWidth, gfx.textWidth(text[idx]))
        }

        w = maxWidth + 10
        h = text.length * 12 + 8

        if (node.data.selected === true) {
          gfx.rect(pt.x - w / 2 - 5, pt.y - h / 2 - 5, w + 10, h + 10, 4,
                   {fill: "lightblue", alpha: 255})
        }
        
        gfx.rect(pt.x-w/2, pt.y - h/2, w, h, 4, {fill: color, alpha: 255})

        for (var idx in text) {
          gfx.text(text[idx], pt.x, pt.y - (h / 2) + (12 * idx) + 16,
                   {color:"white", align:"center", font:"Arial", size:12})
          gfx.text(text[idx], pt.x, pt.y - (h / 2) + (12 * idx) + 16, 
                   {color:"white", align:"center", font:"Arial", size:12})
        }
      })
    }
  }

  var sys = arbor.ParticleSystem(1000, 600, 0.5)
  sys.parameters({gravity:true})
  sys.renderer = graphRenderer

  var updateGraph = function(doi) {
    if (sys.getNode(doi) !== undefined) {
      sys.getNode(doi).data.label = "[opening...]"
      graphRenderer.redraw()
    }

    $.ajax({
      type: "post",
      contentType: "x-doi",
      processData: false,
      url: "/refs",
      data: doi,
      dataType: "json",
      success: function(data) {
        for (var i in data) {
          var from = data[i]["from"]
          var to = data[i]["to"]

          if (sys.getNode(from) === undefined) {
            sys.addNode(from, {collected: true, selected: true, label: ""})
            getBibo(from, true)
          } else {
            sys.getNode(from).data.collected = true
            sys.getNode(from).data.label = ""
          }

          if (sys.getNode(to) === undefined) {
            sys.addNode(to)
            getBibo(to, false)
          }

          sys.addEdge(from, to)
        }

        if (data.length === 0) {
          if (sys.getNode(doi) === undefined) {
            sys.addNode(doi, {collected: true, label: "[No citations]"})
          } else {
            sys.getNode(doi).data.label = "[No citations]"
            sys.getNode(doi).data.collected = true
          }
        }
        
        graphRenderer.redraw()
      }
    })
  }

  var getBibo = function(doi, displayAfter) {
    $.ajax({
      type: "post",
      contentType: "x-doi",
      data: doi,
      processData: false,
      url: "/bibo",
      dataType: "json",
      success: function(data) {
        var node = sys.getNode(doi)
        node.data.bibo = data
        if (data["title"] !== undefined) {
          node.data.title = data["title"]
          graphRenderer.redraw()              
        }

        if (displayAfter) {
          updateBibo(doi)
        }
      }
    })
  }

  var updateBibo = function(doi) {
    if (sys.getNode(doi).data["bibo"] === undefined) {
      getBibo(doi, true)
      return
    }

    var data = sys.getNode(doi).data.bibo
    
    if (data["title"] !== undefined) {
      $("#bibo-title").text(data["title"])
    }

    if (data["DOI"] !== undefined) {
      $("#bibo-publisher-link").attr("href", "http://dx.doi.org/" + data["DOI"])
    }

    if (data["container-title"] !== undefined) {
      $("#bibo-publication-text").text(data["container-title"])
      $("#bibo-publication").show()
    } else {
      $("bibo-publication").hide()
    }

    if (data["issued"] !== undefined) {
      $("#bibo-date-text").text(data["issued"]["date-parts"][0][0])
      $("#bibo-date").show()
    } else {
      $("bibo-date").hide()
    }

    if (data["page"] !== undefined) {
      $("#bibo-pages-text").text(data["page"])
      $("#bibo-pages").show()
    } else {
      $("bibo-pages").hide()
    }

    if (data["author"] !== undefined) {
      $("#bibo-authors-list").html("")

      for (var idx in data["author"]) {
        var html = "<li>"

        if (data["author"][idx]["given"] !== undefined) {
          html += data["author"][idx]["given"] + " "
        }
        
        if (data["author"][idx]["family"] !== undefined) {
          html += data["author"][idx]["family"]
        }
        
        if (html !== "<li>") {
          html += "</li>"
          $("#bibo-authors-list").append(html)
        }
      }                

      $("#bibo-authors").show()
    } else {
      $("bibo-authors").hide()
    }
  }

  $(canvas).mousedown(function(e) {
    var pos = $(canvas).offset()
    var mousePos = arbor.Point(e.pageX - pos.left, e.pageY - pos.top)
    var nearest = sys.nearest(mousePos)

    if (nearest !== null) {
      if (nearest.node.data.collected !== true) {
        updateGraph(nearest.node.name)
      }

      sys.eachNode(function(node, p) {
        node.data.selected = false
      })
      nearest.node.data.selected = true
      graphRenderer.redraw()

      updateBibo(nearest.node.name)
    }
    return false
  })

  $("#doi-form").submit(function() {
    var doi = $("#doi").val()
    updateGraph(doi)
    return false
  })

})
