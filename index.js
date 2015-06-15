const SqliteToJson = require('sqlite-to-json');
const sqlite3 = require('sqlite3');
const fs = require('fs');

function getAttr(data){
	if (data === "infoBox") 
		return "table";
	if (data === "standard-indented")
		return "p"
	return data;
}

function getReference(data){
	if (data.para){
		return "(" + data.page + "." + data.para + ")";
	} else
	return undefined;
}

function getBookInfo(info){
	var result = {};
	var indexStart = info.indexOf("<em>") + 4;
	var end = info.substr(indexStart).indexOf("</em>");
	result.t = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.c = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.a = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.y = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.p = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.pe = info.substr(indexStart, end);

	indexStart += info.substr(indexStart).indexOf("\"right\">") + 8;
	end = info.substr(indexStart).indexOf("</td></tr>");
	result.de = info.substr(indexStart, end);

	indexStart = info.indexOf("covers/");
	end = info.substr(indexStart).indexOf(".jpg") + 4;;

	result.is = "http://www.egwwritings.org/media/" + info.substr(indexStart, end).replace('l', 's');
	result.im = "http://www.egwwritings.org/media/" + info.substr(indexStart, end).replace('l', 'm');
	result.il = "http://www.egwwritings.org/media/" + info.substr(indexStart, end);
	console.log(result);
	return result;	
}

fs.readdir('sql/', function (err, files) {
	if (err) throw err;

	files.forEach( function (file) {
		if (file.indexOf(".") < 0){
			var json = {};
			var chapters = [];
			var bookInfo = {};
			var chapName = file + "Chapter.json";
			var parName = file + "Paragraph.json";
			var exporter = new SqliteToJson({
				client: new sqlite3.Database('./sql/' + file)
			});		

			exporter._dataFor('chapter', function(err, data){
				json['chapter'] = data;
				console.log("Chapters are saved");
			});

			exporter._dataFor('search_content', function(err, data){
				json['search_content'] = data;
				console.log("Chapters are saved");
			});

			exporter._dataFor('search', function(err, data){
				json['search_content'] = data;
				console.log("Chapters are saved");
			});

			function search(searchIndex){
				// console.log("Looking for", searchIndex);

				var content = json.search_content;
				var minIndex = 0;
				var maxIndex = content.length-1;
				var currentIndex;
				var currentElement;
				while (minIndex <= maxIndex) {
					currentIndex = Math.floor((minIndex + maxIndex) / 2);
					// console.log("minIndex", minIndex, "maxIndex", maxIndex, "currentIndex", currentIndex);

					if (content[currentIndex].paragraph_id < searchIndex) {
						minIndex = currentIndex + 1;
					}
					else if (content[currentIndex].paragraph_id > searchIndex) {
						maxIndex = currentIndex - 1;
					}
					else if (content[currentIndex].paragraph_id == searchIndex) {
						// console.log("Found", searchIndex);
						return content[currentIndex].content;
					}
				}
				return "";
			}

			exporter._dataFor('paragraph', function (err, data) {
				json['paragraph'] = data;
				json.chapter.sort(function(a, b){
					return a.number - b.number;
				});
				json.paragraph.sort(function(a, b){
					return a.number - b.number;
				})
				json.search_content.sort(function(a, b){
					return a.paragraph_id - b.paragraph_id;
				})
				console.log("paragraph are saved");
				console.log("Ready");
				var overview = [];
				var chapRep = ""; // temporay unique index for chapter
				var keyIndex;
				for (var i = 0; i < json.chapter.length; i++) {
					var chapIndex = json.chapter[i].title.indexOf("Chapter");
					if (chapIndex > -1){
						var barIndex = json.chapter[i].title.substr(0,9).indexOf("—");
						chapIndex = json.chapter[i].title.substring(chapIndex + 8, barIndex);
						json.chapter[i].title = json.chapter[i].title.substring(barIndex+1);
						keyIndex = chapIndex;
					}
					else{
						chapRep += "i";
						keyIndex = chapRep;
					}
					var input = {
						i : keyIndex,
						t : json.chapter[i].title,
						e : {},
						p : [],
						c : [],
						s : {
							v : 0,
							f : 0,
							t : 0,
							g : 0
						}
					};
					if (i > 0){
						input.e.p = {
							i : json.chapter[i-1].id,
							t : json.chapter[i-1].title
						} 
					}

					if (i < (json.chapter.length - 1)){
						input.e.n = {
							i : json.chapter[i+1].id,
							t : json.chapter[i+1].title
						} 
					}
					overview.push({
						i : json.chapter[i].id,
						t : json.chapter[i].title
					});

					var wordCount = 0;
					var diff = 0;
					for (var p = 0; p < json.paragraph.length; p++) {
						if (json.paragraph[p].chapter_id == json.chapter[i].id){
							var item = {
								c : getAttr(json.paragraph[p].css_classes),
								p : json.paragraph[p].content,
								r : getReference(json.paragraph[p])
							};
							if (item.c === "table"){
								item.p = item.p.replace("_s.jpg", "_l.jpg");
								bookInfo = getBookInfo(item.p);
							}
							input.s = search(json.paragraph[p].id);
							if (input.s !== undefined && input.s.length !== undefined)
								wordCount += input.s.length;
							input.p.push(item);
						}
					};
					input.w = wordCount;
					// console.log("wordCount", wordCount);
					chapters.push(input);
				};

				var output = {
					info : bookInfo,
					chapters : chapters,
					overview : overview
				}

				fs.writeFile('wwww/json/' + file + '.json', JSON.stringify(output));
			} );
}
});
});