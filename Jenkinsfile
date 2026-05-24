pipeline {
    agent any

    environment {
        PROJECT_DIR = "/home/Kelompok8/SIPETA_WEB"
    }

    stages {

        stage('Pull Latest Code') {
            steps {
                sh '''
                cd $PROJECT_DIR

                git reset --hard
                git clean -fd
                git pull origin main
                '''
            }
        }

        stage('Build Backend Image') {
            steps {
                sh '''
                cd $PROJECT_DIR

                docker build --no-cache \
                -t sipeta-backend \
                ./sipeta-backend
                '''
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh '''
                cd $PROJECT_DIR

                docker build --no-cache \
                -t sipeta-frontend \
                ./sipeta-frontend
                '''
            }
        }

        stage('Deploy Stack') {
            steps {
                sh '''
                cd $PROJECT_DIR

                docker stack deploy -c docker-compose.yml sipeta
                '''
            }
        }

        stage('Force Update Services') {
            steps {
                sh '''
                docker service update --force sipeta_backend
                docker service update --force sipeta_frontend
                '''
            }
        }

        stage('Cleanup Old Images') {
            steps {
                sh '''
                docker image prune -af
                '''
            }
        }

        stage('Verify Services') {
            steps {
                sh '''
                docker service ls
                docker ps
                '''
            }
        }
    }

    post {

        success {
            echo 'SIPETA deployed successfully'
        }

        failure {
            echo 'Deploy failed'
        }
    }
}
